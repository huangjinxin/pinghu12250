<template>
  <div class="points-summary">
    <div class="summary-header">
      <n-icon :size="18" color="#eab308"><Star /></n-icon>
      <span>积分概览</span>
    </div>

    <div class="stats-grid">
      <div class="stat-item today">
        <div class="stat-label">今日积分</div>
        <div class="stat-value">
          <span class="sign">+</span>{{ todayPoints }}
        </div>
      </div>
      <div class="stat-item total">
        <div class="stat-label">总积分</div>
        <div class="stat-value">{{ totalPoints.toLocaleString() }}</div>
      </div>
      <div class="stat-item week">
        <div class="stat-label">本周积分</div>
        <div class="stat-value">
          <span class="sign">+</span>{{ weekPoints }}
        </div>
      </div>
      <div class="stat-item submissions">
        <div class="stat-label">任务完成</div>
        <div class="stat-value">{{ taskCount }}</div>
      </div>
    </div>

    <!-- 等级进度 -->
    <div v-if="showLevel" class="level-progress">
      <div class="level-info">
        <span class="level-badge">Lv.{{ level }}</span>
        <span class="level-name">{{ levelName }}</span>
        <span class="level-next">距下一级 {{ nextLevelPoints }} 分</span>
      </div>
      <n-progress
        type="line"
        :percentage="levelProgress"
        :height="6"
        :border-radius="3"
        :show-indicator="false"
        color="#eab308"
        rail-color="#fef3c7"
      />
    </div>
  </div>
</template>

<script setup>
import Star from '@vicons/ionicons5/es/Star'

defineProps({
  // 今日积分
  todayPoints: {
    type: Number,
    default: 0,
  },
  // 总积分
  totalPoints: {
    type: Number,
    default: 0,
  },
  // 本周积分
  weekPoints: {
    type: Number,
    default: 0,
  },
  // 任务完成数
  taskCount: {
    type: Number,
    default: 0,
  },
  // 是否显示等级
  showLevel: {
    type: Boolean,
    default: true,
  },
  // 当前等级
  level: {
    type: Number,
    default: 1,
  },
  // 等级名称
  levelName: {
    type: String,
    default: '新手',
  },
  // 等级进度百分比
  levelProgress: {
    type: Number,
    default: 0,
  },
  // 距下一级所需积分
  nextLevelPoints: {
    type: Number,
    default: 0,
  },
});
</script>

<style scoped>
.points-summary {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-weight: 600;
  color: #1f2937;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  padding: 12px;
  border-radius: 10px;
  text-align: center;
}

.stat-item.today {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.stat-item.total {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.stat-item.week {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.stat-item.submissions {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.stat-value .sign {
  font-size: 14px;
  color: #16a34a;
}

.today .stat-value {
  color: #b45309;
}

.today .stat-value .sign {
  color: #b45309;
}

.total .stat-value {
  color: #1d4ed8;
}

.week .stat-value {
  color: #059669;
}

.submissions .stat-value {
  color: #7c3aed;
}

/* 等级进度 */
.level-progress {
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.level-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.level-badge {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 12px;
}

.level-name {
  font-weight: 500;
  color: #1f2937;
}

.level-next {
  color: #9ca3af;
  margin-left: auto;
}
</style>
