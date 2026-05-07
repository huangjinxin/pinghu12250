#!/bin/bash
#
# 一键上传到 TestFlight
# 用法: ./scripts/upload-testflight.sh [--skip-build]
#

set -e

# ==================== 配置 ====================
APP_NAME="pinghu12250"
SCHEME="pinghu12250"
PROJECT_DIR="$(cd "$(dirname "$0")/../ios-app/" && pwd)"
PROJECT_PATH="$PROJECT_DIR/pinghu12250.xcodeproj"
EXPORT_OPTIONS="$PROJECT_DIR/ExportOptions.plist"
BUILD_DIR="$PROJECT_DIR/build"

# App Store Connect API 配置
API_KEY_ID="PW7J7G82D7"
API_ISSUER_ID="266b0b28-8ef5-49c4-af51-6f2340a16d63"
API_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_${API_KEY_ID}.p8"

# ==================== 颜色输出 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ==================== 检查依赖 ====================
check_requirements() {
    log_info "检查环境..."

    if [ ! -f "$API_KEY_PATH" ]; then
        log_error "API Key 文件不存在: $API_KEY_PATH"
        exit 1
    fi

    if [ ! -f "$PROJECT_PATH/project.pbxproj" ]; then
        log_error "Xcode 项目不存在: $PROJECT_PATH"
        exit 1
    fi

    if [ ! -f "$EXPORT_OPTIONS" ]; then
        log_error "ExportOptions.plist 不存在: $EXPORT_OPTIONS"
        exit 1
    fi

    log_success "环境检查通过"
}

# ==================== 手动输入版本号 ====================
prompt_version() {
    PBXPROJ="$PROJECT_PATH/project.pbxproj"

    # 获取当前版本号
    CURRENT_VERSION=$(grep -m1 "MARKETING_VERSION" "$PBXPROJ" | sed 's/.*= \(.*\);/\1/')

    echo ""
    log_info "当前版本号: ${YELLOW}$CURRENT_VERSION${NC}"
    echo ""
    echo -e "请输入新版本号 (直接回车保持 $CURRENT_VERSION):"
    read -p "> " NEW_VERSION

    # 如果用户直接回车，保持当前版本
    if [ -z "$NEW_VERSION" ]; then
        NEW_VERSION="$CURRENT_VERSION"
        log_info "保持版本号: $NEW_VERSION"
    else
        # 验证版本号格式 (x.y.z)
        if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            log_error "版本号格式错误，应为 x.y.z (如 1.0.1)"
            exit 1
        fi

        # 更新 project.pbxproj 中的版本号
        sed -i '' "s/MARKETING_VERSION = .*;/MARKETING_VERSION = $NEW_VERSION;/g" "$PBXPROJ"
        log_success "版本号已更新: $CURRENT_VERSION -> $NEW_VERSION"
    fi

    echo ""
}

# ==================== 自动增加构建号 ====================
bump_build_number() {
    log_info "自动增加构建号..."
    cd "$PROJECT_DIR"

    # 获取当前构建号并+1
    CURRENT_BUILD=$(agvtool what-version -terse 2>/dev/null || echo "0")
    NEW_BUILD=$((CURRENT_BUILD + 1))

    agvtool new-version -all $NEW_BUILD > /dev/null 2>&1

    log_success "构建号: $CURRENT_BUILD -> $NEW_BUILD"
}

# ==================== 清理并构建 Archive ====================
build_archive() {
    log_info "开始构建 Archive..."

    # 清理旧构建
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"

    # 构建 Archive
    xcodebuild clean archive \
        -project "$PROJECT_PATH" \
        -scheme "$SCHEME" \
        -configuration Release \
        -archivePath "$BUILD_DIR/$APP_NAME.xcarchive" \
        CODE_SIGN_STYLE=Automatic \
        -allowProvisioningUpdates \
        -authenticationKeyPath "$API_KEY_PATH" \
        -authenticationKeyID "$API_KEY_ID" \
        -authenticationKeyIssuerID "$API_ISSUER_ID" \
        | grep -E '(Signing|error:|warning:|BUILD|Archive)'

    if [ ! -d "$BUILD_DIR/$APP_NAME.xcarchive" ]; then
        log_error "Archive 构建失败"
        exit 1
    fi

    log_success "Archive 构建完成"
}

# ==================== 导出并上传 ====================
export_and_upload() {
    log_info "导出 IPA 并上传到 TestFlight..."

    # ExportOptions.plist 中 destination=upload 会自动上传
    xcodebuild -exportArchive \
        -archivePath "$BUILD_DIR/$APP_NAME.xcarchive" \
        -exportPath "$BUILD_DIR" \
        -exportOptionsPlist "$EXPORT_OPTIONS" \
        -allowProvisioningUpdates \
        -authenticationKeyPath "$API_KEY_PATH" \
        -authenticationKeyID "$API_KEY_ID" \
        -authenticationKeyIssuerID "$API_ISSUER_ID" \
        2>&1 | tee "$BUILD_DIR/export.log" | grep -E '(Progress|Upload|error:|warning:)'

    # 检查是否上传成功
    if grep -q "Upload succeeded" "$BUILD_DIR/export.log"; then
        log_success "上传成功！请在 App Store Connect 查看处理状态"
    else
        log_error "上传可能失败，请检查日志: $BUILD_DIR/export.log"
        exit 1
    fi
}

# ==================== 主流程 ====================
main() {
    echo ""
    echo "=========================================="
    echo "   苹湖少儿空间 - TestFlight 自动上传"
    echo "=========================================="
    echo ""

    SKIP_BUILD=false
    for arg in "$@"; do
        case $arg in
            --skip-build)
                SKIP_BUILD=true
                ;;
        esac
    done

    check_requirements

    if [ "$SKIP_BUILD" = true ]; then
        log_warn "跳过构建，直接上传现有 IPA"
        if [ ! -f "$BUILD_DIR/$APP_NAME.xcarchive/Info.plist" ]; then
            log_error "没有找到现有 Archive"
            exit 1
        fi
    else
        prompt_version
        bump_build_number
        build_archive
    fi

    export_and_upload

    echo ""
    echo "=========================================="
    log_success "全部完成！"
    echo "=========================================="
    echo ""
}

main "$@"
