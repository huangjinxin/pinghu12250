<template>
  <div class="manifesto-page">
    <!-- 顶部导航 -->
    <header class="public-header" :class="{ 'scrolled': isScrolled }">
      <div class="header-content">
        <div class="logo" @click="$router.push('/home')">
          <span class="logo-icon">🌟</span>
          <span class="logo-text">苹湖少儿空间</span>
        </div>
        <nav class="header-nav">
          <router-link to="/home" class="nav-link">首页</router-link>
          <router-link to="/dashboard" class="nav-link">数据概览</router-link>
          <router-link to="/leaderboard" class="nav-link">排行</router-link>
          <router-link to="/gallery" class="nav-link">作品展示</router-link>
          <router-link to="/about" class="nav-link active">关于</router-link>
        </nav>
        <div class="header-actions">
          <n-button quaternary size="small" @click="$router.push('/login')" class="login-btn">登录</n-button>
          <n-button type="primary" size="small" @click="$router.push('/register')">注册</n-button>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="section hero-section reveal" ref="heroSection">
      <div class="hero-bg">
        <svg class="bg-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#a18cd1" />
              <stop offset="50%" stop-color="#fbc2eb" />
              <stop offset="100%" stop-color="#ff9a9e" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#bg-grad)" />
          <circle cx="50" cy="50" r="40" fill="rgba(255,255,255,0.1)" filter="blur(20px)" />
        </svg>
      </div>
      <div class="content-container">
        <h2 class="sub-title">苹湖少儿成长计划</h2>
        <h1 class="main-title gradient-text">底层逻辑与<br/>运行手册</h1>
        <p class="hero-desc">我们不培养听话的录音机，我们培养“系统架构师”。</p>
        <div class="scroll-indicator">
          <span>SCROLL</span>
          <div class="line"></div>
        </div>
      </div>
    </section>

    <!-- Section 1 -->
    <section class="section dark-section reveal">
      <div class="content-container split-layout">
        <div class="text-content">
          <span class="section-num">01</span>
          <h2 class="section-title">核心权力架构：<br/>跷跷板法则</h2>
          <div class="rule-box">
            <h4 class="highlight">基本公式</h4>
            <p>这是一个有限集合。大人做的越多（包办、干涉、给钱、指点），孩子能做的就越少（无能、依赖、没脾气但没主见）。</p>
          </div>
          <p class="section-desc">
            <strong>大人的牺牲：</strong>不是体力上的累，而是心理上的“忍”。要忍受孩子犯错的代价，忍受外界说你不负责的流言。大人要主动“撤退”和“示弱”，把权力让渡给规则和孩子。<br/><br/>
            <strong>目标：</strong>让孩子意识到，他在这个世界里的“有用感”和“控制权”，是靠自己撑起来的。
          </p>
        </div>
        <div class="visual-content">
          <div class="emoji-art">⚖️</div>
          <svg class="abstract-svg" viewBox="0 0 200 200">
            <path d="M 20 180 L 100 80 L 180 180 Z" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
            <circle cx="100" cy="80" r="10" fill="#fff" />
            <line x1="20" y1="80" x2="180" y2="80" stroke="#fff" stroke-width="4" transform="rotate(15 100 80)"/>
            <circle cx="30" cy="60" r="20" fill="rgba(255,255,255,0.8)" transform="rotate(15 100 80)"/>
            <circle cx="170" cy="100" r="10" fill="rgba(255,255,255,0.4)" transform="rotate(15 100 80)"/>
          </svg>
        </div>
      </div>
    </section>

    <!-- Section 2 -->
    <section class="section light-section reveal">
      <div class="content-container split-layout reverse">
        <div class="text-content">
          <span class="section-num">02</span>
          <h2 class="section-title">经济主权系统：<br/>所有权剥离与积分循环</h2>
          <div class="feature-list">
            <div class="feature-item">
              <h4>地基：所有权转换</h4>
              <p>家里的一切（手机、iPad、零花钱、甚至饭菜）默认所有权属于父母或规则。孩子只有“借用权”。</p>
            </div>
            <div class="feature-item">
              <h4>唯一合法的获取路径</h4>
              <p>通过完成学习任务（如可汗学院、代码项目、无人机模拟等）获得系统自动结算的积分。</p>
            </div>
          </div>
          <div class="rule-box light">
            <h4 class="highlight">运行逻辑：模拟真实世界</h4>
            <ul>
              <li><strong>分期与信用：</strong>买不起设备可以分期，但没完成任务就断供、回收设备。</li>
              <li><strong>浮动汇率：</strong>积分换钱、换特权的汇率是浮动的，让他们明白什么是财务规划。</li>
              <li><strong>宣誓仪式：</strong>建立“私产意识”，你不碰别人的，别人也别想动你的。</li>
            </ul>
          </div>
        </div>
        <div class="visual-content">
          <div class="emoji-art">🪙🔄</div>
          <svg class="abstract-svg" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="10 10" class="rotate-slow"/>
            <circle cx="100" cy="100" r="40" fill="#000" />
            <text x="100" y="105" text-anchor="middle" fill="#fff" font-size="20" font-weight="bold">¥</text>
            <path d="M 100 20 A 80 80 0 0 1 180 100" fill="none" stroke="#000" stroke-width="4" marker-end="url(#arrow)"/>
          </svg>
        </div>
      </div>
    </section>

    <!-- Section 3 -->
    <section class="section dark-section reveal">
      <div class="content-container split-layout">
        <div class="text-content">
          <span class="section-num">03</span>
          <h2 class="section-title">群众路线：<br/>把孩子变成系统的“开发者”</h2>
          <p class="section-desc emphasize">充分发动孩子：不要试图去“管”孩子，要让他们“自律”。</p>
          <div class="feature-list">
            <div class="feature-item">
              <h4>系统进化论</h4>
              <p>规则不是死板的，允许孩子找漏洞（Hack the system）。被孩子破译了、绕过了，不是坏事，而是升级系统的契机。拉着孩子一起写代码、改规则，把“破坏者”变成“架构师”。</p>
            </div>
            <div class="feature-item">
              <h4>技术平权</h4>
              <p>承认孩子在很多技术领域比大人强。大人只负责维护底层的“地基”，剩下的扩展功能让孩子们自己去折腾。</p>
            </div>
          </div>
        </div>
        <div class="visual-content">
          <div class="emoji-art">👨‍💻🛠️</div>
          <div class="code-block-mockup">
            <div class="mockup-header">
              <span></span><span></span><span></span>
            </div>
            <div class="mockup-body">
              <p><span>function</span> hackSystem(child) {</p>
              <p class="indent"><span>if</span> (child.findsLoophole()) {</p>
              <p class="indent-2">system.upgrade();</p>
              <p class="indent-2">child.promoteTo("Architect");</p>
              <p class="indent">}</p>
              <p>}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 4 -->
    <section class="section gray-section reveal">
      <div class="content-container center-layout">
        <span class="section-num">04</span>
        <h2 class="section-title">情感重构：<br/>先有“理性的账”，再谈“感性的爱”</h2>
        <p class="section-desc large">
          从交易到认知：只有孩子亲手算过积分、付过生活费，他才能真实地感受到：原来父母以前的付出是如此昂贵。
        </p>
        
        <div class="cards-container">
          <div class="card">
            <div class="card-icon">⚖️</div>
            <h4>规则保底</h4>
            <p>破坏规则就扣分、打手心，这是法治，保住素质底线。</p>
          </div>
          <div class="card">
            <div class="card-icon">🦁</div>
            <h4>勇气溢出</h4>
            <p>鼓励那种“我愿意承担被扣分的代价，也要去挑战高难度”的行为。</p>
          </div>
          <div class="card">
            <div class="card-icon">🤝</div>
            <h4>利他精神</h4>
            <p>把个人技能换成“共享区零食”，让展示自我的欲望转化为真实的社区贡献。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 5 -->
    <section class="section light-section reveal">
      <div class="content-container split-layout reverse">
        <div class="text-content">
          <span class="section-num">05</span>
          <h2 class="section-title">公平协议：<br/>针对贫困生的“童话世界”</h2>
          <div class="feature-list">
            <div class="feature-item">
              <h4>逻辑闭环</h4>
              <p>系统对所有孩子表面上是绝对公平的。</p>
            </div>
            <div class="feature-item">
              <h4>无感资助</h4>
              <p>家庭困难的孩子，其设备由空间提供。他们通过“系统任务”（看店、打扫、带新人、助教）来抵消学费和换取积分。</p>
            </div>
            <div class="feature-item">
              <h4>维护尊严</h4>
              <p>在孩子们的视角里，他们是一样通过劳动和系统规则在生存。保护他们对世界“公平性”的底层信仰。</p>
            </div>
          </div>
        </div>
        <div class="visual-content">
          <div class="emoji-art">🏰🤝</div>
          <svg class="abstract-svg" viewBox="0 0 200 200">
            <rect x="40" y="100" width="120" height="80" fill="none" stroke="#000" stroke-width="2"/>
            <polygon points="100,40 30,100 170,100" fill="none" stroke="#000" stroke-width="2"/>
            <rect x="85" y="140" width="30" height="40" fill="#000" />
            <circle cx="100" cy="100" r="30" fill="rgba(0,0,0,0.1)"/>
          </svg>
        </div>
      </div>
    </section>

    <!-- Section 6 -->
    <section class="section dark-section hero-section reveal">
      <div class="hero-bg">
        <svg class="bg-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect width="100" height="100" fill="url(#bg-grad)" />
          <circle cx="50" cy="100" r="60" fill="rgba(255,255,255,0.15)" filter="blur(30px)" />
        </svg>
      </div>
      <div class="content-container center-layout end-layout">
        <span class="section-num">06</span>
        <h2 class="section-title gradient-text">终局目标：<br/>18岁后的“主权独立”</h2>
        <div class="emoji-art large">🚀🦅</div>
        <p class="section-desc large">
          我们不培养听话的录音机，<br/>我们培养“系统架构师”。
        </p>
        <p class="section-desc">
          离开这个空间后，他们带走的不仅是技术，而是一套可以陪伴终身的“自我管理系统”。他们会参考这套逻辑，去建设他们自己的青年空间和人生规则。
        </p>
        <div class="cta-buttons">
          <n-button type="primary" size="large" round @click="$router.push('/register')">加入计划</n-button>
          <n-button size="large" round ghost color="#fff" @click="$router.push('/home')">返回首页</n-button>
        </div>
      </div>
    </section>
    
    <footer class="manifesto-footer">
      © 2024 苹湖少儿空间. Designed with ❤️
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { NButton } from 'naive-ui';
import { useRouter } from 'vue-router';

const router = useRouter();
const isScrolled = ref(false);

const handleScroll = () => {
  isScrolled.value = window.scrollY > 50;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  
  // Intersection Observer for scroll animations
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal').forEach((el) => {
    observer.observe(el);
  });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
/* Base Styles */
.manifesto-page {
  background-color: #f8f9fa;
  color: #1d1d1f;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  overflow-x: hidden;
}

/* Header */
.public-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: transparent;
  backdrop-filter: blur(0px);
  transition: all 0.3s ease;
  z-index: 100;
  border-bottom: 1px solid transparent;
}
.public-header.scrolled {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.header-content {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.logo-text {
  font-weight: 600;
  font-size: 18px;
  color: #1d1d1f;
}
.header-nav {
  display: flex;
  gap: 32px;
}
.nav-link {
  color: rgba(29, 29, 31, 0.7);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s;
}
.nav-link:hover, .nav-link.active {
  color: #1d1d1f;
}
.login-btn {
  color: #1d1d1f !important;
}

/* Section Layouts */
.section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 100px 24px;
  overflow: hidden;
}
.content-container {
  max-width: 1000px;
  width: 100%;
  position: relative;
  z-index: 10;
}
.split-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}
.split-layout.reverse {
  grid-template-columns: 1fr 1fr;
}
.split-layout.reverse .text-content {
  order: 2;
}
.split-layout.reverse .visual-content {
  order: 1;
}
.center-layout {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

/* Themes */
.dark-section { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #1d1d1f; }
.light-section { background-color: #fff; color: #1d1d1f; }
.gray-section { background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); color: #1d1d1f; }

/* Typography */
.section-num {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 2px;
  opacity: 0.5;
  display: block;
  margin-bottom: 24px;
}
.main-title {
  font-size: clamp(48px, 8vw, 96px);
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 24px 0;
}
.sub-title {
  font-size: 24px;
  font-weight: 500;
  color: rgba(29,29,31,0.7);
  margin-bottom: 16px;
}
.section-title {
  font-size: clamp(32px, 5vw, 48px);
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 32px;
}
.section-desc {
  font-size: 18px;
  line-height: 1.6;
  opacity: 0.8;
  margin-bottom: 24px;
}
.section-desc.large {
  font-size: 24px;
  line-height: 1.5;
  font-weight: 500;
}
.section-desc.emphasize {
  font-size: 20px;
  font-weight: 600;
  color: inherit;
  opacity: 1;
}

.gradient-text {
  background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.dark-section .gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.light-section .gradient-text,
.gray-section .gradient-text {
  background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Feature Lists & Boxes */
.rule-box {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.8);
  padding: 32px;
  border-radius: 24px;
  margin-bottom: 32px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.02);
}
.rule-box.light {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.05);
}
.rule-box .highlight {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
  opacity: 0.6;
}
.rule-box p, .rule-box li {
  font-size: 18px;
  line-height: 1.5;
}
.rule-box ul {
  padding-left: 20px;
}
.rule-box li {
  margin-bottom: 12px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 32px;
}
.feature-item h4 {
  font-size: 20px;
  margin-bottom: 8px;
}
.feature-item p {
  font-size: 16px;
  opacity: 0.8;
  line-height: 1.5;
}

/* Visual Elements */
.visual-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  height: 400px;
}
.emoji-art {
  font-size: 120px;
  line-height: 1;
  filter: drop-shadow(0 20px 30px rgba(0,0,0,0.2));
  z-index: 2;
  position: absolute;
}
.emoji-art.large {
  font-size: 160px;
  position: relative;
  margin: 40px 0;
}
.abstract-svg {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0.2;
  z-index: 1;
}

/* Animations */
.rotate-slow {
  transform-origin: center;
  animation: rotate 20s linear infinite;
}
@keyframes rotate {
  100% { transform: rotate(360deg); }
}

/* Code Mockup */
.code-block-mockup {
  background: #282a36;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  overflow: hidden;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 14px;
  color: #f8f8f2;
  position: relative;
  z-index: 2;
}
.mockup-header {
  background: #44475a;
  padding: 12px 16px;
  display: flex;
  gap: 8px;
}
.mockup-header span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff5f56;
}
.mockup-header span:nth-child(2) { background: #ffbd2e; }
.mockup-header span:nth-child(3) { background: #27c93f; }
.mockup-body {
  padding: 24px;
  text-align: left;
}
.mockup-body span { color: #569cd6; } /* keyword */
.mockup-body .indent { padding-left: 20px; }
.mockup-body .indent-2 { padding-left: 40px; }

/* Cards Grid */
.cards-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 60px;
}
.card {
  background: #fff;
  border-radius: 24px;
  padding: 40px 30px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.card:hover {
  transform: translateY(-10px);
}
.card-icon {
  font-size: 48px;
  margin-bottom: 24px;
}
.card h4 {
  font-size: 20px;
  margin-bottom: 16px;
  color: #1d1d1f;
}
.card p {
  font-size: 15px;
  line-height: 1.5;
  color: #86868b;
}

/* Scroll Reveal Animation */
.reveal {
  opacity: 0;
  transform: translateY(60px);
  transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* Hero specifics */
.hero-section {
  text-align: center;
}
.hero-bg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 1;
  overflow: hidden;
}
.bg-svg {
  width: 100%;
  height: 100%;
}
.scroll-indicator {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  opacity: 0.5;
}
.scroll-indicator span {
  font-size: 10px;
  letter-spacing: 2px;
}
.scroll-indicator .line {
  width: 1px;
  height: 60px;
  background: linear-gradient(to bottom, #fff, transparent);
}

.cta-buttons {
  margin-top: 40px;
  display: flex;
  gap: 16px;
  justify-content: center;
}

.manifesto-footer {
  text-align: center;
  padding: 40px;
  font-size: 12px;
  color: rgba(29,29,31,0.5);
  background: #f8f9fa;
}

/* Responsive */
@media (max-width: 768px) {
  .split-layout {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  .split-layout.reverse .text-content { order: 1; }
  .split-layout.reverse .visual-content { order: 2; }
  .cards-container {
    grid-template-columns: 1fr;
  }
  .header-nav { display: none; }
  .section { padding: 80px 20px; }
  .visual-content { height: 300px; }
}
</style>
