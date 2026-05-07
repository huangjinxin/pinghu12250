<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-800">我的资产</h1>
      <p class="text-gray-500 mt-1">管理你的积分和学习币</p>
    </div>

    <!-- 双货币卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- 积分卡片 -->
      <n-card class="points-card">
        <div class="text-center py-8">
          <div class="flex items-center justify-center mb-2">
            <n-icon size="24" class="mr-2">
              <TrophyOutline />
            </n-icon>
            <span class="text-lg font-medium">我的积分</span>
          </div>
          <div class="text-5xl font-bold mb-4">{{ userPoints || 0 }}</div>
          <div class="flex justify-center gap-2">
            <n-button @click="showPointsDetail">查看明细</n-button>
            <n-button @click="handleFinance">理财</n-button>
          </div>
        </div>
      </n-card>

      <!-- 学习币卡片 -->
      <n-card class="coins-card">
        <div class="text-center py-8">
          <div class="flex items-center justify-center mb-2">
            <n-icon size="24" class="mr-2">
              <DiamondOutline />
            </n-icon>
            <span class="text-lg font-medium">学习币</span>
          </div>
          <div class="text-5xl font-bold mb-4">{{ Number(wallet.balance || 0).toFixed(2) }}</div>
          <div class="flex justify-center gap-2">
            <n-button type="primary" @click="showExchangeModal = true">兑换</n-button>
            <n-button type="success" @click="startCameraScanning">
              <template #icon>
                <n-icon><QrCodeOutline /></n-icon>
              </template>
              扫码支付
            </n-button>
          </div>
        </div>
      </n-card>

      <!-- 个人信用卡片 -->
      <n-card
        class="credit-card cursor-pointer hover:shadow-lg transition-shadow"
        :class="getCreditCardBgClass(creditScore.creditScore)"
        @click="goToCreditHistory"
      >
        <div class="text-center py-6">
          <div class="flex items-center justify-center mb-2">
            <n-icon size="24" class="mr-2">
              <ShieldOutline />
            </n-icon>
            <span class="text-lg font-medium">个人信用</span>
            <n-tag type="warning" size="small" class="ml-2">开发中</n-tag>
          </div>
          <n-spin :show="loadingCreditScore">
            <div class="text-6xl font-bold mb-3" :class="getCreditScoreColor(creditScore.creditScore)">
              {{ creditScore.creditScore || 800 }}
            </div>
            <div class="text-sm text-gray-600 mb-2">{{ creditScore.creditLevel || '优秀' }}</div>
            <div class="text-xs text-gray-500">{{ creditScore.creditMessage || '表现稳定，继续保持' }}</div>
            <div v-if="creditScore.thisWeekDeductionCount > 0" class="mt-2">
              <n-tag type="warning" size="small">本周扣分 {{ creditScore.thisWeekDeductionCount }} 次</n-tag>
            </div>
          </n-spin>
        </div>
      </n-card>
    </div>

<!-- 兑换说明 -->
    <n-alert type="info">
      <div>学习币是稀缺货币，可以通过积分兑换获得。</div>
      <div class="mt-1">当前比例：{{ exchangeConfig.rate?.points || 100 }} 积分 = {{ exchangeConfig.rate?.coins || 10 }} 学习币。</div>
    </n-alert>

    <!-- 积分倒数排行榜 -->
    <n-card title="积分倒数排行榜 TOP5" size="small">
      <template #header-extra>
        <n-icon color="#ef4444"><TrophyOutline /></n-icon>
      </template>
      <n-spin :show="loadingLeaderboard">
        <div v-if="leaderboard.length > 0" class="space-y-2">
          <div
            v-for="(user, index) in leaderboard"
            :key="user.id"
            class="flex items-center justify-between py-2 px-3 rounded-lg"
            :class="index === 0 ? 'bg-red-50' : index === 1 ? 'bg-orange-50' : index === 2 ? 'bg-yellow-50' : 'bg-white'"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                :class="{
                  'bg-red-400 text-white': index === 0,
                  'bg-orange-400 text-white': index === 1,
                  'bg-yellow-400 text-white': index === 2,
                  'bg-gray-200 text-gray-600': index > 2
                }"
              >
                {{ index + 1 }}
              </div>
              <n-avatar :src="user.avatar" :size="32" round>
                {{ (user.displayName || user.username || '?').charAt(0) }}
              </n-avatar>
              <span class="font-medium">{{ user.displayName || user.username }}</span>
            </div>
            <div class="font-bold text-red-600">{{ user.totalPoints || 0 }} 分</div>
          </div>
        </div>
        <n-empty v-else description="暂无排行数据" size="small" />
      </n-spin>
    </n-card>

    <!-- 标签页：积分明细 / 学习币明细 / 兑换记录 -->
    <n-card>
      <n-tabs v-model:value="activeTab" type="line" animated>
        <!-- 积分明细 -->
        <n-tab-pane name="points" tab="积分明细">
          <n-spin :show="loadingPoints">
            <div v-if="pointLogs.length > 0" class="space-y-3">
              <div v-for="log in pointLogs" :key="log.id" class="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <h4 class="font-medium">{{ log.description }}</h4>
                  <p class="text-xs text-gray-500">{{ formatDate(log.createdAt) }}</p>
                </div>
                <div :class="['font-bold text-lg', log.points > 0 ? 'text-green-600' : 'text-red-600']">
                  {{ log.points > 0 ? '+' : '' }}{{ log.points }}
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无积分记录" />
          </n-spin>
        </n-tab-pane>

        <!-- 学习币明细 -->
        <n-tab-pane name="coins" tab="学习币明细">
          <n-spin :show="loadingCoins">
            <div v-if="coinTransactions.length > 0" class="space-y-3">
              <div v-for="transaction in coinTransactions" :key="transaction.id" class="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <h4 class="font-medium">{{ transaction.description }}</h4>
                  <p class="text-xs text-gray-500">{{ formatDate(transaction.createdAt) }}</p>
                </div>
                <div :class="['font-bold text-lg', transaction.amount > 0 ? 'text-green-600' : 'text-red-600']">
                  {{ transaction.amount > 0 ? '+' : '' }}{{ Number(transaction.amount).toFixed(2) }}
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无学习币记录" />
          </n-spin>
        </n-tab-pane>

        <!-- 兑换记录 -->
        <n-tab-pane name="exchange" tab="兑换记录">
          <n-spin :show="loadingExchange">
            <div v-if="exchangeHistory.length > 0" class="space-y-3">
              <div v-for="exchange in exchangeHistory" :key="exchange.id" class="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <h4 class="font-medium">积分兑换学习币</h4>
                  <p class="text-xs text-gray-500">{{ formatDate(exchange.createdAt) }}</p>
                  <p class="text-xs text-gray-600">兑换比例：{{ exchange.exchangeRate }}</p>
                </div>
                <div class="text-right">
                  <div class="text-red-600 font-bold">-{{ exchange.pointsSpent }} 积分</div>
                  <div class="text-green-600 font-bold">+{{ exchange.coinsGained }} 学习币</div>
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无兑换记录" />
          </n-spin>
        </n-tab-pane>

        <!-- 支付记录 -->
        <n-tab-pane name="payment" tab="支付记录">
          <!-- 筛选栏 -->
          <div class="mb-4 p-3 bg-gray-50 rounded-lg">
            <n-space wrap>
              <n-date-picker
                v-model:value="paymentFilters.dateRange"
                type="daterange"
                clearable
                :shortcuts="dateRangeShortcuts"
                size="small"
                style="width: 240px"
              />
              <n-select
                v-model:value="paymentFilters.category"
                placeholder="选择分类"
                :options="paymentCategoryOptions"
                clearable
                size="small"
                style="width: 120px"
              />
              <n-input
                v-model:value="paymentFilters.keyword"
                placeholder="搜索商品名称"
                clearable
                size="small"
                style="width: 140px"
                @keyup.enter="handlePaymentSearch"
              >
                <template #prefix>
                  <n-icon size="14"><SearchOutline /></n-icon>
                </template>
              </n-input>
              <n-button size="small" type="primary" @click="handlePaymentSearch">搜索</n-button>
              <n-button size="small" @click="handlePaymentReset">重置</n-button>
            </n-space>
            <!-- 筛选结果统计 -->
            <div v-if="hasPaymentFilters" class="mt-2 text-sm text-gray-500">
              筛选结果：{{ paymentSummary.totalCount }} 条记录
              <span v-if="paymentSummary.walletCount">，学习币 <span class="text-red-600 font-medium">{{ paymentSummary.walletAmount.toFixed(2) }}</span></span>
              <span v-if="paymentSummary.pointsCount">，积分 <span class="text-orange-500 font-medium">{{ paymentSummary.pointsAmount.toFixed(0) }}</span></span>
            </div>
          </div>

          <n-spin :show="loadingPayments">
            <div v-if="paymentOrders.length > 0" class="space-y-3">
              <div v-for="order in paymentOrders" :key="order.id" class="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <h4 class="font-medium">{{ order.title }}</h4>
                  <p class="text-xs text-gray-500">{{ formatDate(order.createdAt) }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs text-gray-600">订单号：{{ order.orderNo }}</span>
                    <n-tag v-if="order.typeLabel" size="tiny" :type="order.type === 'installment' ? 'warning' : 'default'">
                      {{ order.typeLabel }}
                    </n-tag>
                    <n-tag v-if="order.category || order.payCode?.category" size="tiny">
                      {{ order.category || order.payCode?.category }}
                    </n-tag>
                  </div>
                </div>
                <div class="text-right flex items-center gap-2">
                  <div>
                    <div :class="['font-bold', order.paymentMethod === 'points' ? 'text-orange-500' : 'text-red-600']">
                      -{{ order.paymentMethod === 'points' ? Number(order.amount).toFixed(0) + ' 积分' : Number(order.amount).toFixed(2) + ' 学习币' }}
                    </div>
                    <n-tag type="success" size="small">已完成</n-tag>
                  </div>
                  <n-button size="small" quaternary @click="copyReceipt(order)">
                    复制凭证
                  </n-button>
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无支付记录" />
          </n-spin>

          <!-- 分页 -->
          <div v-if="paymentPagination.total > paymentPagination.pageSize" class="mt-4 flex justify-center">
            <n-pagination
              v-model:page="paymentPagination.page"
              :page-size="paymentPagination.pageSize"
              :item-count="paymentPagination.total"
              :page-sizes="[10, 20, 50]"
              show-size-picker
              @update:page="handlePaymentPageChange"
              @update:page-size="handlePaymentPageSizeChange"
            />
          </div>
        </n-tab-pane>

        <!-- 付款计划 -->
        <n-tab-pane name="paymentPlan" tab="付款计划">
          <n-spin :show="loadingPaymentPlans">
            <div v-if="paymentPlans.length > 0" class="space-y-4">
              <div v-for="plan in paymentPlans" :key="plan.id" class="border rounded-lg p-4">
                <div class="flex items-start justify-between mb-3">
                  <div>
                    <h4 class="font-medium text-lg">{{ plan.payCode?.title }}</h4>
                    <p class="text-xs text-gray-500">创建于 {{ formatDate(plan.createdAt) }}</p>
                  </div>
                  <n-tag :type="getPlanStatusType(plan.status)" size="small">
                    {{ getPlanStatusText(plan.status) }}
                  </n-tag>
                </div>

                <!-- 进度条 -->
                <div class="mb-3">
                  <div class="flex justify-between text-sm mb-1">
                    <span>还款进度</span>
                    <span>{{ plan.paidInstallments }}/{{ plan.installments }} 期</span>
                  </div>
                  <n-progress
                    type="line"
                    :percentage="Math.round(plan.paidInstallments / plan.installments * 100)"
                    :status="plan.status === 'completed' ? 'success' : plan.status === 'overdue' ? 'error' : 'default'"
                  />
                </div>

                <!-- 金额信息 -->
                <div class="grid grid-cols-3 gap-2 text-sm mb-3">
                  <div class="text-center p-2 bg-gray-50 rounded">
                    <div class="text-gray-500">总金额</div>
                    <div class="font-bold">{{ Number(plan.totalAmount).toFixed(2) }}</div>
                  </div>
                  <div class="text-center p-2 bg-green-50 rounded">
                    <div class="text-gray-500">已付</div>
                    <div class="font-bold text-green-600">{{ Number(plan.paidAmount).toFixed(2) }}</div>
                  </div>
                  <div class="text-center p-2 bg-orange-50 rounded">
                    <div class="text-gray-500">待付</div>
                    <div class="font-bold text-orange-600">{{ getRemainingAmount(plan) }}</div>
                  </div>
                </div>

                <!-- 当期信息和操作按钮 -->
                <div v-if="plan.status !== 'completed'" class="flex items-center justify-between pt-3 border-t">
                  <div class="text-sm">
                    <span class="text-gray-500">下期还款：</span>
                    <span class="font-medium">{{ Number(getCurrentSchedule(plan)?.amount || 0).toFixed(2) }} 学习币</span>
                    <span class="text-gray-400 ml-2">
                      ({{ new Date(plan.nextDueDate).toLocaleDateString('zh-CN') }})
                    </span>
                  </div>
                  <div class="flex gap-2">
                    <n-button size="small" type="primary" @click="openPayPlanModal(plan, 'pay')">
                      还当期
                    </n-button>
                    <n-button size="small" @click="openPayPlanModal(plan, 'payAll')">
                      一次还清
                    </n-button>
                  </div>
                </div>

                <!-- 还款日程展开 -->
                <n-collapse class="mt-3">
                  <n-collapse-item title="查看还款日程" name="schedule">
                    <div class="space-y-2">
                      <div
                        v-for="schedule in plan.schedules"
                        :key="schedule.id"
                        class="flex items-center justify-between py-2 px-3 rounded text-sm"
                        :class="{
                          'bg-green-50': schedule.status === 'paid' || schedule.status === 'paid_late',
                          'bg-red-50': schedule.status === 'overdue',
                          'bg-gray-50': schedule.status === 'pending'
                        }"
                      >
                        <div class="flex items-center gap-2">
                          <span class="font-medium">第{{ schedule.installmentNo }}期</span>
                          <span class="text-gray-500">{{ new Date(schedule.dueDate).toLocaleDateString('zh-CN') }}</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="font-medium">{{ Number(schedule.amount).toFixed(2) }}</span>
                          <n-tag
                            size="tiny"
                            :type="schedule.status === 'paid' ? 'success' : schedule.status === 'paid_late' ? 'warning' : schedule.status === 'overdue' ? 'error' : 'default'"
                          >
                            {{ schedule.status === 'paid' ? '已付' : schedule.status === 'paid_late' ? '逾期付' : schedule.status === 'overdue' ? '逾期' : '待付' }}
                          </n-tag>
                        </div>
                      </div>
                    </div>
                  </n-collapse-item>
                </n-collapse>
              </div>
            </div>
            <n-empty v-else description="暂无付款计划" />
          </n-spin>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 兑换弹窗 -->
    <n-modal v-model:show="showExchangeModal" preset="dialog" title="积分兑换学习币">
      <div class="space-y-4">
        <n-alert v-if="exchangeConfig.unlimited" type="success">
          周日不限量兑换！
        </n-alert>
        <n-alert v-else type="info">
          兑换比例：{{ exchangeConfig.rate?.points || 100 }} 积分 = {{ exchangeConfig.rate?.coins || 10 }} 学习币<br />
          今日剩余额度：{{ exchangeConfig.remainingLimit || 0 }} 积分
        </n-alert>

        <n-form-item label="兑换积分">
          <n-input-number
            v-model:value="exchangePoints"
            :min="0"
            :max="exchangeConfig.unlimited ? 1000000 : exchangeConfig.remainingLimit"
            :step="exchangeConfig.rate?.points || 100"
            placeholder="输入要兑换的积分"
            style="width: 100%"
          />
        </n-form-item>

        <n-alert v-if="exchangePoints > 0" type="success">
          可获得学习币：{{ calculateCoins(exchangePoints) }}
        </n-alert>
      </div>

      <template #action>
        <div class="flex gap-2">
          <n-button @click="showExchangeModal = false">取消</n-button>
          <n-button type="primary" @click="handleExchange" :loading="exchanging">确认兑换</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 扫码支付弹窗 -->
    <n-modal v-model:show="showScanModal" preset="dialog" title="扫码支付">
      <div class="space-y-4">
        <n-alert type="info">
          请输入商家提供的收款码
        </n-alert>

        <n-form-item label="收款码">
          <n-input
            v-model:value="scanCode"
            placeholder="请输入收款码或点击摄像头扫码"
            clearable
            @keyup.enter="handleScanCode"
          >
            <template #prefix>
              <n-icon><QrCodeOutline /></n-icon>
            </template>
            <template #suffix>
              <n-button
                text
                @click="startCameraScanning"
                :disabled="cameraScanning"
                title="使用摄像头扫码"
              >
                <n-icon :size="20" :color="cameraScanning ? '#ccc' : '#18a058'">
                  <CameraOutline />
                </n-icon>
              </n-button>
            </template>
          </n-input>
        </n-form-item>
      </div>

      <template #action>
        <div class="flex gap-2">
          <n-button @click="showScanModal = false">取消</n-button>
          <n-button type="primary" @click="handleScanCode" :loading="scanning">确认</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 摄像头扫码弹窗 -->
    <n-modal
      v-model:show="showCameraScanner"
      preset="dialog"
      title="扫描二维码"
      :mask-closable="false"
      :style="{ width: '95%', maxWidth: '600px' }"
      :closable="false"
    >
      <div class="camera-scanner-container">
        <div id="qr-reader" class="qr-reader"></div>
        <n-alert type="info" class="mt-4">
          <template #icon>
            <n-icon><CameraOutline /></n-icon>
          </template>
          将二维码对准扫描框，保持稳定
        </n-alert>
        <div class="camera-tips mt-2">
          <n-text depth="3" style="font-size: 12px;">
            提示：如无法启动摄像头，请确保使用 HTTPS 访问，并在浏览器中允许摄像头权限
          </n-text>
        </div>
      </div>
      <template #action>
        <div class="flex gap-2">
          <n-button @click="switchToManualInput">
            手动输入
          </n-button>
          <n-button type="error" @click="stopCameraScanning" :loading="!cameraScanning">
            关闭摄像头
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- 支付确认弹窗 -->
    <n-modal v-model:show="showPaymentModal" preset="dialog" title="确认支付">
      <div v-if="currentPayCode" class="space-y-4">
        <n-alert type="warning">
          请确认支付信息
        </n-alert>

        <div class="bg-gray-50 p-4 rounded-lg space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600">商品名称</span>
            <span class="font-medium">{{ currentPayCode.title }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">支付金额</span>
            <span class="font-bold text-xl text-primary-600">{{ Number(currentPayCode.amount).toFixed(2) }} 学习币</span>
          </div>
          <div v-if="currentPayCode.description" class="flex justify-between">
            <span class="text-gray-600">描述</span>
            <span class="text-sm">{{ currentPayCode.description }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">当前余额</span>
            <span :class="Number(wallet.balance) >= Number(currentPayCode.amount) ? 'text-green-600' : 'text-red-600'">
              {{ Number(wallet.balance).toFixed(2) }} 学习币
            </span>
          </div>
        </div>

        <n-alert v-if="Number(wallet.balance) < Number(currentPayCode.amount)" type="error">
          余额不足，请先兑换学习币
        </n-alert>
      </div>

      <template #action>
        <div class="flex gap-2">
          <n-button @click="showPaymentModal = false">取消</n-button>
          <n-button
            type="primary"
            @click="openPasswordModal"
            :loading="paying"
            :disabled="!currentPayCode || Number(wallet.balance) < Number(currentPayCode.amount)"
          >
            确认支付
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- 支付密码输入弹窗 -->
    <n-modal v-model:show="showPasswordModal" preset="dialog" title="输入支付密码">
      <div class="space-y-4">
        <n-alert type="info">
          请输入支付密码完成支付（默认密码：123456）
        </n-alert>

        <n-form-item label="支付密码">
          <n-input
            v-model:value="paymentPassword"
            type="password"
            placeholder="请输入支付密码"
            show-password-on="click"
            @keyup.enter="handlePayment"
          />
        </n-form-item>
      </div>

      <template #action>
        <div class="flex gap-2">
          <n-button @click="showPasswordModal = false">取消</n-button>
          <n-button
            type="primary"
            @click="handlePayment"
            :loading="paying"
            :disabled="!paymentPassword"
          >
            确认支付
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- 支付成功弹窗 -->
    <n-modal v-model:show="showSuccessModal" preset="dialog" title="支付成功">
      <div v-if="paymentResult" class="text-center space-y-4 py-4">
        <n-icon size="64" color="#52c41a">
          <CheckmarkCircleOutline />
        </n-icon>
        <div>
          <h3 class="text-lg font-bold mb-2">支付成功！</h3>
          <p class="text-gray-600">{{ paymentResult.title }}</p>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg space-y-2 text-left">
          <div class="flex justify-between">
            <span class="text-gray-600">订单号</span>
            <span class="font-mono text-sm">{{ paymentResult.orderNo }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">支付金额</span>
            <span class="font-bold">{{ Number(paymentResult.amount).toFixed(2) }} 学习币</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">支付时间</span>
            <span class="text-sm">{{ formatDate(paymentResult.createdAt) }}</span>
          </div>
        </div>
      </div>

      <template #action>
        <div class="flex gap-2">
          <n-button @click="copyPaymentReceipt">
            <template #icon>
              <n-icon><CopyOutline /></n-icon>
            </template>
            复制凭证
          </n-button>
          <n-button type="primary" @click="closeSuccessModal">完成</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 付款计划支付确认弹窗 -->
    <n-modal v-model:show="showPayPlanModal" preset="dialog" :title="payPlanAction === 'payAll' ? '一次性还清' : '支付当期'">
      <div v-if="currentPayPlan" class="space-y-4">
        <n-alert :type="payPlanAction === 'payAll' ? 'warning' : 'info'">
          {{ payPlanAction === 'payAll' ? '确认一次性还清所有剩余款项？' : '确认支付当期款项？' }}
        </n-alert>

        <div class="bg-gray-50 p-4 rounded-lg space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600">商品名称</span>
            <span class="font-medium">{{ currentPayPlan.payCode?.title }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">支付金额</span>
            <span class="font-bold text-xl text-primary-600">
              {{ payPlanAction === 'payAll' ? getRemainingAmount(currentPayPlan) : Number(getCurrentSchedule(currentPayPlan)?.amount || 0).toFixed(2) }} 学习币
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">当前余额</span>
            <span :class="Number(wallet.balance) >= (payPlanAction === 'payAll' ? Number(getRemainingAmount(currentPayPlan)) : Number(getCurrentSchedule(currentPayPlan)?.amount || 0)) ? 'text-green-600' : 'text-red-600'">
              {{ Number(wallet.balance).toFixed(2) }} 学习币
            </span>
          </div>
        </div>
      </div>

      <template #action>
        <div class="flex gap-2">
          <n-button @click="showPayPlanModal = false">取消</n-button>
          <n-button type="primary" @click="openPayPlanPasswordModal">确认支付</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 付款计划支付密码弹窗 -->
    <n-modal v-model:show="showPayPlanPasswordModal" preset="dialog" title="输入支付密码">
      <div class="space-y-4">
        <n-alert type="info">
          请输入支付密码完成支付（默认密码：123456）
        </n-alert>

        <n-form-item label="支付密码">
          <n-input
            v-model:value="payPlanPassword"
            type="password"
            placeholder="请输入支付密码"
            show-password-on="click"
            @keyup.enter="handlePayPlan"
          />
        </n-form-item>
      </div>

      <template #action>
        <div class="flex gap-2">
          <n-button @click="showPayPlanPasswordModal = false">取消</n-button>
          <n-button
            type="primary"
            @click="handlePayPlan"
            :loading="payingPlan"
            :disabled="!payPlanPassword"
          >
            确认支付
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useMessage } from 'naive-ui';
import { pointAPI, walletAPI, payAPI, paymentPlanAPI } from '@/api';
import TrophyOutline from '@vicons/ionicons5/es/TrophyOutline'
import DiamondOutline from '@vicons/ionicons5/es/DiamondOutline'
import QrCodeOutline from '@vicons/ionicons5/es/QrCodeOutline'
import CheckmarkCircleOutline from '@vicons/ionicons5/es/CheckmarkCircleOutline'
import CameraOutline from '@vicons/ionicons5/es/CameraOutline'
import CopyOutline from '@vicons/ionicons5/es/CopyOutline'
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import CalendarOutline from '@vicons/ionicons5/es/CalendarOutline'
import WalletOutline from '@vicons/ionicons5/es/WalletOutline'
import ShieldOutline from '@vicons/ionicons5/es/ShieldOutline'
import { useRouter } from 'vue-router';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuthStore } from '@/stores/auth';

const message = useMessage();
const router = useRouter();
const authStore = useAuthStore();

// 数据
const userPoints = ref(0);
const wallet = reactive({ balance: 0 });
const pointLogs = ref([]);
const coinTransactions = ref([]);
const exchangeHistory = ref([]);
const exchangeConfig = reactive({
  rate: { points: 100, coins: 10 },
  dailyLimit: 5000,
  todayUsed: 0,
  remainingLimit: 5000,
});

// 加载状态
const loadingPoints = ref(false);
const loadingCoins = ref(false);
const loadingExchange = ref(false);
const loadingPayments = ref(false);
const loadingLeaderboard = ref(false);
const loadingPaymentPlans = ref(false);

// 排行榜数据
const leaderboard = ref([]);

// 信用分数据
const creditScore = reactive({
  creditScore: 0,
  creditLevel: '',
  creditMessage: '',
  thisWeekDeductionCount: 0,
});
const loadingCreditScore = ref(false);

// 付款计划数据
const paymentPlans = ref([]);
const showPayPlanModal = ref(false);
const showPayPlanPasswordModal = ref(false);
const currentPayPlan = ref(null);
const payPlanPassword = ref('');
const payingPlan = ref(false);
const payPlanAction = ref(''); // 'pay' 或 'payAll'

// UI 状态
const activeTab = ref('points');
const showExchangeModal = ref(false);
const exchangePoints = ref(0);
const exchanging = ref(false);

// 扫码支付状态
const showScanModal = ref(false);
const showPaymentModal = ref(false);
const showPasswordModal = ref(false);
const showSuccessModal = ref(false);
const scanCode = ref('');
const currentPayCode = ref(null);
const paymentResult = ref(null);
const scanning = ref(false);
const paying = ref(false);
const paymentOrders = ref([]);
const paymentPassword = ref('');
const paymentCategories = ref([]);
const paymentSummary = reactive({ walletAmount: 0, walletCount: 0, pointsAmount: 0, pointsCount: 0, totalCount: 0 });
const paymentPagination = reactive({ page: 1, pageSize: 20, total: 0 });
const paymentFilters = reactive({
  dateRange: null,
  keyword: '',
  category: null,
});

// 日期范围快捷选项
const dateRangeShortcuts = {
  '今天': () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return [start.getTime(), now.getTime()];
  },
  '最近7天': () => {
    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return [start.getTime(), now.getTime()];
  },
  '最近30天': () => {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return [start.getTime(), now.getTime()];
  },
  '本月': () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return [start.getTime(), now.getTime()];
  },
};

// 分类选项
const paymentCategoryOptions = computed(() => {
  return paymentCategories.value.map(c => ({
    label: c,
    value: c,
  }));
});

// 是否有筛选条件
const hasPaymentFilters = computed(() => {
  return paymentFilters.dateRange || paymentFilters.keyword || paymentFilters.category;
});

// 摄像头扫码状态
const showCameraScanner = ref(false);
const cameraScanning = ref(false);
let html5QrCode = null;

// 计算可获得的学习币
const calculateCoins = (points) => {
  if (!points || !exchangeConfig.rate) return 0;
  return Math.floor((points / exchangeConfig.rate.points) * exchangeConfig.rate.coins);
};

// 加载积分信息
const loadPointsInfo = async () => {
  try {
    const response = await pointAPI.getMyPoints();
    userPoints.value = response.totalPoints || 0;
  } catch (error) {
    message.error(error.message || '加载积分失败');
  }
};

// 加载积分排行榜（倒数后5名）
const loadLeaderboard = async () => {
  loadingLeaderboard.value = true;
  try {
    const response = await pointAPI.getLeaderboard({ limit: 5, order: 'asc' });
    // 后端返回 leaderboard 字段
    leaderboard.value = response.leaderboard || [];
  } catch (error) {
    console.error('加载排行榜失败:', error);
  } finally {
    loadingLeaderboard.value = false;
  }
};

// 加载积分明细
const loadPointLogs = async () => {
  loadingPoints.value = true;
  try {
    const response = await pointAPI.getPointLogs({ limit: 50 });
    // 后端返回 records 字段
    pointLogs.value = (response.records || []).map(r => ({
      id: r.id,
      points: r.points,
      description: r.description || r.actionName || '积分变动',
      createdAt: r.createdAt,
    }));
  } catch (error) {
    message.error(error.message || '加载积分明细失败');
  } finally {
    loadingPoints.value = false;
  }
};

// 加载学习币信息
const loadWallet = async () => {
  try {
    const response = await walletAPI.getWallet();
    Object.assign(wallet, response.wallet || {});
  } catch (error) {
    message.error(error.message || '加载学习币失败');
  }
};

// 加载学习币交易记录
const loadCoinTransactions = async () => {
  loadingCoins.value = true;
  try {
    const response = await walletAPI.getTransactions();
    coinTransactions.value = response.transactions || [];
  } catch (error) {
    message.error(error.message || '加载学习币明细失败');
  } finally {
    loadingCoins.value = false;
  }
};

// 加载兑换配置
const loadExchangeConfig = async () => {
  try {
    const response = await pointAPI.getExchangeConfig();
    Object.assign(exchangeConfig, response);
  } catch (error) {
    message.error(error.message || '加载兑换配置失败');
  }
};

// 加载信用分
const loadCreditScore = async () => {
  loadingCreditScore.value = true;
  try {
    const response = await pointAPI.getCreditScore();
    Object.assign(creditScore, response);
  } catch (error) {
    console.error('加载信用分失败:', error);
  } finally {
    loadingCreditScore.value = false;
  }
};

// 跳转到信用历史页面
const goToCreditHistory = () => {
  router.push('/wallet/credit-history');
};

// 获取信用分颜色
const getCreditScoreColor = (score) => {
  if (score >= 800) return 'text-emerald-500';
  if (score >= 600) return 'text-blue-500';
  return 'text-orange-500';
};

// 获取卡片背景色
const getCreditCardBgClass = (score) => {
  if (score >= 800) return 'credit-card-green';
  if (score >= 600) return 'credit-card-blue';
  return 'credit-card-orange';
};

// 加载兑换历史
const loadExchangeHistory = async () => {
  loadingExchange.value = true;
  try {
    const response = await pointAPI.getExchangeHistory();
    exchangeHistory.value = response.exchanges || [];
  } catch (error) {
    message.error(error.message || '加载兑换记录失败');
  } finally {
    loadingExchange.value = false;
  }
};

// 执行兑换
const handleExchange = async () => {
  if (!exchangePoints.value || exchangePoints.value <= 0) {
    message.warning('请输入兑换积分');
    return;
  }

  if (!exchangeConfig.unlimited && exchangePoints.value > exchangeConfig.remainingLimit) {
    message.warning('超出今日兑换上限');
    return;
  }

  exchanging.value = true;
  try {
    const response = await pointAPI.exchangePointsToCoins({ points: exchangePoints.value });
    message.success(response.message || '兑换成功');
    showExchangeModal.value = false;
    exchangePoints.value = 0;

    // 重新加载数据
    await Promise.all([
      loadPointsInfo(),
      loadPointLogs(),
      loadWallet(),
      loadExchangeConfig(),
      loadExchangeHistory(),
    ]);
  } catch (error) {
    message.error(error.message || '兑换失败');
  } finally {
    exchanging.value = false;
  }
};

// 查看积分明细（跳转到积分页面）
const showPointsDetail = () => {
  activeTab.value = 'points';
};

// 理财功能（暂未开放）
const handleFinance = () => {
  message.info('理财功能即将上线，敬请期待');
};

// 加载支付记录
const loadPaymentOrders = async () => {
  loadingPayments.value = true;
  try {
    const params = {
      page: paymentPagination.page,
      limit: paymentPagination.pageSize,
    };

    // 添加筛选参数
    if (paymentFilters.dateRange && paymentFilters.dateRange.length === 2) {
      params.startDate = new Date(paymentFilters.dateRange[0]).toISOString().split('T')[0];
      params.endDate = new Date(paymentFilters.dateRange[1]).toISOString().split('T')[0];
    }
    if (paymentFilters.keyword) {
      params.keyword = paymentFilters.keyword;
    }
    if (paymentFilters.category) {
      params.category = paymentFilters.category;
    }

    const data = await payAPI.getMyOrders(params);
    paymentOrders.value = data.orders;
    paymentCategories.value = data.categories || [];
    paymentSummary.walletAmount = data.summary?.walletAmount || 0;
    paymentSummary.walletCount = data.summary?.walletCount || 0;
    paymentSummary.pointsAmount = data.summary?.pointsAmount || 0;
    paymentSummary.pointsCount = data.summary?.pointsCount || 0;
    paymentSummary.totalCount = data.summary?.totalCount || 0;
    paymentPagination.total = data.pagination?.total || 0;
  } catch (error) {
    console.error('加载支付记录失败:', error);
  } finally {
    loadingPayments.value = false;
  }
};

// 支付记录搜索
const handlePaymentSearch = () => {
  paymentPagination.page = 1;
  loadPaymentOrders();
};

// 支付记录重置筛选
const handlePaymentReset = () => {
  paymentFilters.dateRange = null;
  paymentFilters.keyword = '';
  paymentFilters.category = null;
  paymentPagination.page = 1;
  loadPaymentOrders();
};

// 支付记录分页变化
const handlePaymentPageChange = (page) => {
  paymentPagination.page = page;
  loadPaymentOrders();
};

// 支付记录每页条数变化
const handlePaymentPageSizeChange = (pageSize) => {
  paymentPagination.pageSize = pageSize;
  paymentPagination.page = 1;
  loadPaymentOrders();
};

// 加载付款计划
const loadPaymentPlans = async () => {
  loadingPaymentPlans.value = true;
  try {
    const data = await paymentPlanAPI.list();
    paymentPlans.value = data.plans || [];
  } catch (error) {
    console.error('加载付款计划失败:', error);
  } finally {
    loadingPaymentPlans.value = false;
  }
};

// 打开付款计划支付弹窗
const openPayPlanModal = (plan, action) => {
  currentPayPlan.value = plan;
  payPlanAction.value = action;
  showPayPlanModal.value = true;
};

// 打开付款计划密码弹窗
const openPayPlanPasswordModal = () => {
  payPlanPassword.value = '';
  showPayPlanPasswordModal.value = true;
};

// 处理付款计划支付
const handlePayPlan = async () => {
  if (!currentPayPlan.value || !payPlanPassword.value) return;

  payingPlan.value = true;
  try {
    let result;
    if (payPlanAction.value === 'payAll') {
      result = await paymentPlanAPI.payAll(currentPayPlan.value.id, payPlanPassword.value);
    } else {
      result = await paymentPlanAPI.pay(currentPayPlan.value.id, payPlanPassword.value);
    }
    message.success(result.message || '支付成功');
    showPayPlanPasswordModal.value = false;
    showPayPlanModal.value = false;
    currentPayPlan.value = null;
    payPlanPassword.value = '';
    // 刷新数据
    await Promise.all([loadWallet(), loadPaymentPlans()]);
  } catch (error) {
    message.error(error.error || error.message || '支付失败');
  } finally {
    payingPlan.value = false;
  }
};

// 获取付款计划状态标签
const getPlanStatusType = (status) => {
  const map = { active: 'info', completed: 'success', overdue: 'error' };
  return map[status] || 'default';
};

const getPlanStatusText = (status) => {
  const map = { active: '进行中', completed: '已完成', overdue: '已逾期' };
  return map[status] || status;
};

// 获取当期待付款项
const getCurrentSchedule = (plan) => {
  if (!plan.schedules) return null;
  return plan.schedules.find(s => s.status === 'pending' || s.status === 'overdue');
};

// 计算剩余金额
const getRemainingAmount = (plan) => {
  return (Number(plan.totalAmount) - Number(plan.paidAmount)).toFixed(2);
};

// 处理扫码
const handleScanCode = async () => {
  if (!scanCode.value.trim()) {
    message.warning('请输入收款码');
    return;
  }

  scanning.value = true;
  try {
    const data = await payAPI.scanPayCode(scanCode.value.trim());
    currentPayCode.value = data.payCode;
    showScanModal.value = false;
    showPaymentModal.value = true;
  } catch (error) {
    message.error(error.error || '收款码无效');
  } finally {
    scanning.value = false;
  }
};

// 打开支付密码弹窗
const openPasswordModal = () => {
  paymentPassword.value = '';
  showPasswordModal.value = true;
};

// 处理支付
const handlePayment = async () => {
  if (!currentPayCode.value) return;

  if (!paymentPassword.value) {
    message.warning('请输入支付密码');
    return;
  }

  paying.value = true;
  try {
    const result = await payAPI.submitPayment({
      payCodeId: currentPayCode.value.id,
      paymentPassword: paymentPassword.value
    });
    paymentResult.value = result.order;
    showPasswordModal.value = false;
    showPaymentModal.value = false;
    showSuccessModal.value = true;

    // 刷新数据
    await Promise.all([
      loadWallet(),
      loadCoinTransactions(),
      loadPaymentOrders(),
    ]);
  } catch (error) {
    message.error(error.error || '支付失败');
  } finally {
    paying.value = false;
  }
};

// 关闭支付成功弹窗
const closeSuccessModal = () => {
  showSuccessModal.value = false;
  scanCode.value = '';
  currentPayCode.value = null;
  paymentResult.value = null;
  paymentPassword.value = '';
  activeTab.value = 'payment'; // 切换到支付记录tab
};

// 切换到手动输入
const switchToManualInput = async () => {
  await stopCameraScanning();
  showScanModal.value = true;
};

// 复制支付凭证
const copyReceipt = async (order) => {
  const username = authStore.user?.username || '未知用户';
  const isPoints = order.paymentMethod === 'points';
  const amountText = isPoints ? `${Number(order.amount).toFixed(0)} 积分` : `${Number(order.amount).toFixed(2)} 学习币`;
  const receiptText = `【支付凭证】
用户：${username}
项目：${order.title}
金额：${amountText}
订单号：${order.orderNo}
支付时间：${formatDate(order.createdAt)}
状态：已完成`;

  try {
    await navigator.clipboard.writeText(receiptText);
    message.success('凭证已复制到剪贴板');
  } catch (error) {
    // 兼容不支持 clipboard API 的浏览器
    const textarea = document.createElement('textarea');
    textarea.value = receiptText;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      message.success('凭证已复制到剪贴板');
    } catch (e) {
      message.error('复制失败，请手动复制');
    }
    document.body.removeChild(textarea);
  }
};

// 复制当前支付成功的凭证
const copyPaymentReceipt = async () => {
  if (!paymentResult.value) return;
  await copyReceipt(paymentResult.value);
};

// 检测是否为iOS设备
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// 检测是否为安全上下文（HTTPS或localhost）
const isSecureContext = () => {
  // 使用浏览器原生 isSecureContext 属性
  if (typeof window.isSecureContext !== 'undefined') {
    return window.isSecureContext;
  }
  // 兼容性检查
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return protocol === 'https:' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost');
};

// 检测浏览器是否支持摄像头
const isCameraSupported = () => {
  // 检查是否在安全上下文中
  if (!isSecureContext()) {
    console.warn('非安全上下文，摄像头API不可用');
    return false;
  }
  // 检查 mediaDevices API
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

// 获取可用的摄像头列表
const getAvailableCameras = async () => {
  try {
    const devices = await Html5Qrcode.getCameras();
    return devices;
  } catch (error) {
    console.error('获取摄像头列表失败:', error);
    return [];
  }
};

// 开始摄像头扫码
const startCameraScanning = async () => {
  try {
    // 检查是否为安全上下文
    if (!isSecureContext()) {
      message.warning('摄像头需要 HTTPS，已切换到手动输入');
      showScanModal.value = true;
      return;
    }

    // 检查浏览器是否支持摄像头
    if (!isCameraSupported()) {
      message.warning('浏览器不支持摄像头，已切换到手动输入');
      showScanModal.value = true;
      return;
    }

    // 先请求摄像头权限
    try {
      console.log('请求摄像头权限...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      console.log('摄像头权限获取成功');
      // 立即停止，让html5-qrcode来管理
      stream.getTracks().forEach(track => track.stop());
    } catch (permissionError) {
      console.error('摄像头权限请求失败:', permissionError);
      let errorMsg = '摄像头不可用';
      if (permissionError.name === 'NotAllowedError') {
        errorMsg = '摄像头权限被拒绝';
      } else if (permissionError.name === 'NotFoundError') {
        errorMsg = '未检测到摄像头';
      } else if (permissionError.name === 'NotReadableError') {
        errorMsg = '摄像头被占用';
      } else if (permissionError.name === 'OverconstrainedError') {
        // 某些设备不支持 environment facingMode，尝试不指定
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          message.warning(errorMsg + '，已切换到手动输入');
          showScanModal.value = true;
          return;
        }
      } else {
        errorMsg = permissionError.message || '摄像头访问失败';
      }
      // 摄像头不可用，直接弹出手动输入框
      if (permissionError.name !== 'OverconstrainedError') {
        message.warning(errorMsg + '，已切换到手动输入');
        showScanModal.value = true;
        return;
      }
    }

    showCameraScanner.value = true;
    cameraScanning.value = true;

    // 等待DOM更新
    await new Promise(resolve => setTimeout(resolve, 300));

    html5QrCode = new Html5Qrcode('qr-reader');

    // 获取可用摄像头
    const cameras = await getAvailableCameras();
    console.log('可用摄像头:', cameras);

    // 配置
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    // 优先使用后置摄像头
    let cameraId = { facingMode: 'environment' };

    // 如果有多个摄像头，尝试选择后置摄像头
    if (cameras.length > 0) {
      // 尝试找后置摄像头
      const backCamera = cameras.find(camera =>
        camera.label.toLowerCase().includes('back') ||
        camera.label.toLowerCase().includes('rear') ||
        camera.label.toLowerCase().includes('环境') ||
        camera.label.toLowerCase().includes('后')
      );
      if (backCamera) {
        cameraId = backCamera.id;
      } else if (cameras.length === 1) {
        // 只有一个摄像头，直接使用
        cameraId = cameras[0].id;
      }
    }

    console.log('使用摄像头:', cameraId);

    await html5QrCode.start(
      cameraId,
      config,
      (decodedText) => {
        // 扫码成功
        handleQRCodeScanned(decodedText);
      },
      (errorMessage) => {
        // 扫码错误（正常情况，持续扫描中）
        // 不需要处理
      }
    );

    message.info('摄像头已启动，请将二维码对准扫描框');

  } catch (error) {
    console.error('启动摄像头失败:', error);

    let errorMsg = '摄像头启动失败';
    if (error.name === 'NotAllowedError' || error.message?.includes('Permission')) {
      errorMsg = '摄像头权限被拒绝';
    } else if (error.name === 'NotFoundError') {
      errorMsg = '未检测到摄像头';
    } else if (error.name === 'NotReadableError') {
      errorMsg = '摄像头被占用';
    } else if (error.name === 'OverconstrainedError') {
      errorMsg = '摄像头配置不支持';
    }

    // 启动失败，自动切换到手动输入
    message.warning(errorMsg + '，已切换到手动输入');
    showCameraScanner.value = false;
    cameraScanning.value = false;
    showScanModal.value = true;
  }
};

// 停止摄像头扫码
const stopCameraScanning = async () => {
  try {
    if (html5QrCode && cameraScanning.value) {
      await html5QrCode.stop();
      html5QrCode.clear();
      html5QrCode = null;
    }
  } catch (error) {
    console.error('停止摄像头失败:', error);
  } finally {
    showCameraScanner.value = false;
    cameraScanning.value = false;
  }
};

// 处理扫码结果
const handleQRCodeScanned = async (decodedText) => {
  // 停止扫码
  await stopCameraScanning();

  // 保存扫码结果
  scanCode.value = decodedText;

  // 直接验证二维码并弹出支付确认界面
  scanning.value = true;
  try {
    const data = await payAPI.scanPayCode(decodedText.trim());
    currentPayCode.value = data.payCode;
    showPaymentModal.value = true;
    message.success('扫码成功！');
  } catch (error) {
    message.error(error.error || '收款码无效');
    // 如果二维码无效，可以提示用户手动输入
    showScanModal.value = true;
  } finally {
    scanning.value = false;
  }
};

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

// 页面加载
onMounted(async () => {
  await Promise.all([
    loadPointsInfo(),
    loadPointLogs(),
    loadWallet(),
    loadCoinTransactions(),
    loadExchangeConfig(),
    loadExchangeHistory(),
    loadPaymentOrders(),
    loadLeaderboard(),
    loadPaymentPlans(),
    loadCreditScore(),
  ]);
});

// 组件卸载时停止摄像头
onUnmounted(() => {
  if (html5QrCode && cameraScanning.value) {
    stopCameraScanning();
  }
});
</script>

<style scoped>
.points-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.coins-card {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.points-card :deep(.n-card__content),
.coins-card :deep(.n-card__content) {
  color: white;
}

.points-card :deep(.n-button),
.coins-card :deep(.n-button) {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.points-card :deep(.n-button:hover),
.coins-card :deep(.n-button:hover) {
  background: rgba(255, 255, 255, 0.3);
}

/* 信用卡片样式 */
.credit-card {
  transition: all 0.3s ease;
}

.credit-card:hover {
  transform: translateY(-2px);
}

.credit-card-green {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border-color: #10b981;
}

.credit-card-green :deep(.n-card__content) {
  background: transparent;
}

.credit-card-blue {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-color: #3b82f6;
}

.credit-card-blue :deep(.n-card__content) {
  background: transparent;
}

.credit-card-orange {
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border-color: #f97316;
}

.credit-card-orange :deep(.n-card__content) {
  background: transparent;
}

/* 摄像头扫码容器 */
.camera-scanner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.qr-reader {
  width: 100%;
  max-width: 500px;
  min-height: 300px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background-color: #000;
}

/* 覆盖html5-qrcode默认样式 */
.qr-reader :deep(video) {
  width: 100% !important;
  height: auto !important;
  min-height: 300px;
  border-radius: 6px;
  object-fit: cover;
}

.qr-reader :deep(#qr-shaded-region) {
  border: 3px solid rgba(24, 160, 88, 0.9) !important;
  border-radius: 8px;
}

/* iPad/iOS 优化 */
@media (min-width: 768px) {
  .qr-reader {
    min-height: 400px;
  }

  .qr-reader :deep(video) {
    min-height: 400px;
  }
}

.camera-tips {
  text-align: center;
  padding: 8px;
  background-color: #fef9c3;
  border-radius: 4px;
}

/* 扫码框动画 */
.qr-reader :deep(#qr-shaded-region)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #18a058, transparent);
  animation: scan 2s linear infinite;
}

@keyframes scan {
  0% {
    top: 0;
  }
  50% {
    top: 100%;
  }
  100% {
    top: 0;
  }
}
</style>
