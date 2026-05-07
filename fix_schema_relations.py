#!/usr/bin/env python3
"""
批量修复 schema.prisma 中关系字段名
将 db pull 生成的 PascalCase 字段名改为 JS 代码期望的 camelCase 名
"""
import re
import sys

SCHEMA_PATH = "/Users/beichentech/pinghu12250/backend/prisma/schema.prisma"

# 读取 schema
with open(SCHEMA_PATH, "r") as f:
    content = f.read()

original = content

def rename_in_model(content, model_name, old_field, new_field):
    """在指定 model 块中将 old_field 改为 new_field"""
    # 匹配 model 块
    pattern = rf'(model {re.escape(model_name)} \{{[^}}]*?)(\s+){re.escape(old_field)}(\s+)'
    
    def replacer(m):
        # 确保只替换字段名（整词匹配）
        return m.group(1) + m.group(2) + new_field + m.group(3)
    
    new_content = re.sub(pattern, replacer, content, flags=re.DOTALL)
    if new_content == content:
        print(f"  WARNING: {model_name}.{old_field} → {new_field} - NOT FOUND")
    else:
        print(f"  OK: {model_name}.{old_field} → {new_field}")
    return new_content

# =====================================================
# 策略：逐行处理，在正确的 model 块内做替换
# =====================================================
lines = content.split('\n')
result_lines = []
current_model = None
model_depth = 0

# 记录需要修复的映射: (model_name, old_field_prefix, new_field_name)
# old_field_prefix 是行首（去除空白后）以该字符串开头的行
RENAMES = {
    # model_name: [(old_prefix, new_name), ...]
    "Diary": [
        ("User ", "author"),
    ],
    "DiaryTemplate": [
        ("User ", "author"),
    ],
    "CreativeWork": [
        ("User ", "author"),
    ],
    "CalligraphyWork": [
        ("User ", "author"),
    ],
    "Homework": [
        ("User ", "author"),
    ],
    "Note": [
        ("User ", "author"),
    ],
    "Reading": [
        ("User ", "author"),
    ],
    "HTMLWork": [
        ("User ", "author"),
    ],
    "PoetryWork": [
        ("User ", "author"),
    ],
    "CalendarEvent": [
        ("User ", "user"),
    ],
    "DiaryAnalysis": [
        ("User ", "user"),
    ],
    "DiaryStats": [
        ("User ", "user"),
    ],
    "DiaryMakeupCard": [
        ("User ", "user"),
    ],
    "ImessageSenderMapping": [
        ("User ", "user"),
    ],
    "UserCreditProfile": [
        ("User ", "user"),
    ],
    "UserCreditHistory": [
        ("User ", "user"),
    ],
    "UserDiaryAchievement": [
        ("User ", "user"),
        ("DiaryAchievement ", "achievement"),
    ],
    "UserFont": [
        ("User ", "user"),
    ],
    "UserEvent": [
        ("User ", "user"),
    ],
    "UserBookshelf": [
        ("User ", "user"),
        ("Book ", "book"),
    ],
    "UserPoints": [
        ("User ", "user"),
    ],
    "UserFollow": [
        ("User_UserFollow_followerIdToUser ", "follower"),
        ("User_UserFollow_followingIdToUser ", "following"),
    ],
    "Message": [
        ("User_Message_fromUserIdToUser ", "fromUser"),
        ("User_Message_toUserIdToUser ", "toUser"),
    ],
    "FriendRequest": [
        ("User_FriendRequest_fromUserIdToUser ", "fromUser"),
        ("User_FriendRequest_toUserIdToUser ", "toUser"),
    ],
    "Friendship": [
        ("User_Friendship_userId1ToUser ", "user1"),
        ("User_Friendship_userId2ToUser ", "user2"),
    ],
    "ReviewSession": [
        ("User_ReviewSession_fromUserIdToUser ", "fromUser"),
        ("User_ReviewSession_toUserIdToUser ", "toUser"),
    ],
    "PeerReview": [
        ("User_PeerReview_fromUserIdToUser ", "fromUser"),
        ("User_PeerReview_toUserIdToUser ", "toUser"),
    ],
    "Class": [
        ("School ", "school"),
    ],
    "Teacher": [
        ("User ", "user"),
        ("School ", "school"),
    ],
    "Student": [
        ("User ", "user"),
        ("Class ", "class"),
    ],
    "RuleSubmission": [
        ("RuleTemplate ", "template"),
        ("User_RuleSubmission_reviewedByToUser ", "reviewer"),
        ("User_RuleSubmission_userIdToUser ", "user"),
    ],
    "RuleTemplate": [
        ("RuleType ", "type"),
        ("User ", "author"),
    ],
    "RuleType": [
        ("RuleTemplate ", "templates"),
    ],
    "TemplateFavorite": [
        ("RuleTemplate ", "template"),
        ("User ", "user"),
    ],
    "Transaction": [
        ("User_Transaction_fromUserIdToUser ", "fromUser"),
        ("User_Transaction_toUserIdToUser ", "toUser"),
        ("User_Transaction_userIdToUser ", "user"),
    ],
    "InviteCode": [
        ("User_InviteCode_createdByToUser ", "createdBy"),
        ("User_User_inviteCodeIdToInviteCode ", "users"),
    ],
    # User model itself
    "User": [
        ("Profile ", "profile"),
        ("Class ", "class"),
        ("School ", "school"),
        ("User ", "approvedByUser"),  # self-ref approvedBy
        ("other_User ", "approvedUsers"),
        ("InviteCode_User_inviteCodeIdToInviteCode ", "inviteCode"),
        ("InviteCode_InviteCode_createdByToUser ", "createdInviteCodes"),
    ],
    "PayCode": [
        ("PayOrder ", "orders"),
    ],
    "Category": [
        ("CreativeWork ", "works"),
    ],
    "SyncDevice": [
        ("User ", "user"),
    ],
    "Wallet": [
        ("User ", "user"),
        ("WalletTransaction ", "transactions"),
    ],
    "WalletTransaction": [
        ("Wallet ", "wallet"),
    ],
    "TextbookFavorite": [
        ("Textbook ", "textbook"),
        ("User ", "user"),
    ],
    "TextbookUnit": [
        ("Textbook ", "textbook"),
        ("TextbookLesson ", "lessons"),
    ],
    "TextbookLesson": [
        ("TextbookUnit ", "unit"),
    ],
    "TextbookPrompt": [
        ("Textbook ", "textbook"),
    ],
    "UserDiaryPrompt": [
        ("User ", "user"),
    ],
    "BehaviorLog": [
        ("User ", "user"),
    ],
    "ActivityLog": [
        ("User ", "user"),
    ],
    "LoginActivity": [
        ("User ", "user"),
    ],
    "ScanLog": [
        ("User ", "user"),
    ],
    "UserAchievement": [
        ("Achievement ", "achievement"),
    ],
    "TeacherClass": [
        ("Class ", "class"),
        ("Teacher ", "teacher"),
    ],
    "BotConversation": [
        ("User ", "user"),
        ("BotMessage ", "messages"),
    ],
    "BotMessage": [
        ("BotConversation ", "conversation"),
        ("User ", "user"),
    ],
    "LearningProject": [
        ("User ", "user"),
    ],
    "LearningSession": [
        ("User ", "user"),
    ],
    "LearningSessionLike": [
        ("User ", "user"),
        ("LearningSession ", "session"),
    ],
    "UserGameRecord": [
        ("User ", "user"),
        ("Game ", "game"),
    ],
    "GameLongReview": [
        ("User ", "user"),
        ("Game ", "game"),
    ],
    "GameLongReviewLike": [
        ("User ", "user"),
        ("GameLongReview ", "review"),
    ],
    "GameShortReview": [
        ("User ", "user"),
        ("Game ", "game"),
    ],
    "GameReviewComment": [
        ("User ", "user"),
    ],
    "UserMovieLibrary": [
        ("User ", "user"),
        ("Movie ", "movie"),
    ],
    "MovieLog": [
        ("User ", "user"),
        ("Movie ", "movie"),
    ],
    "MovieLogLike": [
        ("User ", "user"),
        ("MovieLog ", "movieLog"),
    ],
    "UserMusicLibrary": [
        ("User ", "user"),
        ("Music ", "music"),
    ],
    "MusicLog": [
        ("User ", "user"),
        ("Music ", "music"),
    ],
    "MusicLogLike": [
        ("User ", "user"),
        ("MusicLog ", "musicLog"),
    ],
    "ReadingLog": [
        ("User ", "user"),
    ],
    "ReadingLogLike": [
        ("User ", "user"),
        ("ReadingLog ", "readingLog"),
    ],
    "ReadingNote": [
        ("User ", "user"),
    ],
    "Question": [
        ("User ", "user"),
    ],
    "Answer": [
        ("User ", "user"),
        ("Question ", "question"),
    ],
    "Comment": [
        ("User ", "user"),
    ],
    "Like": [
        ("User ", "user"),
    ],
    "Dynamic": [
        ("User ", "user"),
    ],
    "UserFollowedTag": [
        ("GlobalTag ", "tag"),
    ],
    "ContentPurchase": [
        ("User ", "user"),
        ("PaidContent ", "content"),
    ],
    "DailyCompletionReward": [
        ("User ", "user"),
    ],
    "DailyPointsLimit": [
        ("User ", "user"),
    ],
    "DailyReviewTask": [
        ("User ", "user"),
    ],
    "PointExchange": [
        ("User ", "user"),
    ],
    "PayOrder": [
        ("User ", "user"),
        ("PayCode ", "payCode"),
    ],
    "PaymentPlan": [
        ("User ", "user"),
    ],
    "PinyinPractice": [
        ("User ", "user"),
    ],
    "TypingPractice": [
        ("User ", "user"),
    ],
    "WritingEvaluation": [
        ("ReadingNote ", "note"),
    ],
    "StudentParent": [
        ("User_StudentParent_childIdToUser ", "child"),
        ("User_StudentParent_parentIdToUser ", "parent"),
    ],
    "DailyReward": [
        ("User ", "user"),
    ],
    "Feedback": [
        ("User ", "user"),
    ],
    "OfflineActivity": [
        ("User ", "user"),
    ],
    "UserChallengeRecord": [
        ("DailyChallenge ", "dailyChallenge"),
    ],
    "DiaryEmbedding": [
        ("Diary ", "diary"),
    ],
    "PaidContent": [
        ("User ", "user"),
    ],
    "ActiveTimer": [
        ("User ", "user"),
    ],
    "CalligraphyWork": [
        ("User ", "author"),
    ],
    "SyncConflict": [
        ("User ", "user"),
    ],
}

# 执行逐行替换
lines = content.split('\n')
result_lines = []
current_model = None
brace_depth = 0

i = 0
changes = []

while i < len(lines):
    line = lines[i]
    stripped = line.strip()
    
    # 检测 model 开始
    m = re.match(r'^model (\w+) \{', stripped)
    if m:
        current_model = m.group(1)
        brace_depth = 1
        result_lines.append(line)
        i += 1
        continue
    
    # 检测 model 结束
    if current_model and stripped == '}':
        brace_depth -= 1
        if brace_depth == 0:
            current_model = None
        result_lines.append(line)
        i += 1
        continue
    
    # 在 model 块内进行替换
    if current_model and current_model in RENAMES:
        renames = RENAMES[current_model]
        new_line = line
        for (old_prefix, new_name) in renames:
            # 匹配行：前导空白 + old_prefix
            pattern = r'^(\s+)' + re.escape(old_prefix)
            if re.match(pattern, new_line):
                # 替换字段名（保持空白，替换第一个单词）
                new_line = re.sub(
                    r'^(\s+)' + re.escape(old_prefix.rstrip()),
                    r'\g<1>' + new_name,
                    new_line
                )
                if new_line != line:
                    changes.append(f"  [{current_model}] {old_prefix.strip()} → {new_name}")
                break
        result_lines.append(new_line)
    else:
        result_lines.append(line)
    
    i += 1

new_content = '\n'.join(result_lines)

# 写回文件
with open(SCHEMA_PATH, "w") as f:
    f.write(new_content)

print(f"\n完成！共修改 {len(changes)} 处：")
for c in changes:
    print(c)

if len(changes) == 0:
    print("  (无变化，可能字段名已正确或未找到匹配)")
