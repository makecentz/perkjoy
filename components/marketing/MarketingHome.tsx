import Link from "next/link";
/* eslint-disable jsx-a11y/anchor-is-valid */
import {
  ArrowRight, Award, CakeSlice, CalendarDays, Check, ChevronDown,
  Gift, HeartHandshake, MapPin, PartyPopper, Sparkles, Star, Trophy,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const plans = [
  { name: "Starter", people: "Up to 25 employees", price: "$29", featured: false },
  { name: "Growth", people: "Up to 50 employees", price: "$79", featured: true },
  { name: "Business", people: "Up to 100 employees", price: "$179", featured: false },
];

export function MarketingHome() {
  return (
    <main className="marketing-page">
      <nav className="marketing-nav shell">
        <Link href="/" aria-label="PerkJoy home"><Logo /></Link>
        <div className="nav-links">
          <a href="#how">How it works</a><a href="#local">PerkJoy Local</a><a href="#pricing">Pricing</a>
        </div>
        <div className="nav-actions">
          <Link className="button button-ghost" href="/login">Log in</Link>
          <Link className="button button-primary button-small" href="/signup">Start trial <ArrowRight size={15} /></Link>
        </div>
      </nav>

      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15} /> Employee appreciation on autopilot</div>
          <h1>Never miss a moment <span>worth celebrating.</span></h1>
          <p>PerkJoy remembers birthdays, anniversaries, and the wins in between—then sends the perfect reward right on time.</p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" href="/signup">Start trial <ArrowRight size={18} /></Link>
            <a className="button button-secondary button-large" href="#how">See how it works</a>
          </div>
          <div className="hero-proof">
            <span className="card-brand-stack" aria-label="Accepted credit cards: Visa, Mastercard, and American Express">
              <i className="card-brand card-brand-visa" aria-hidden="true">VISA</i>
              <i className="card-brand card-brand-mastercard" aria-hidden="true"><span /><span /></i>
              <i className="card-brand card-brand-amex" aria-hidden="true">AMERICAN<br />EXPRESS</i>
            </span>
            <span><strong>Credit card required</strong><br />Secure payment setup during activation</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="PerkJoy automation preview">
          <span className="confetti confetti-one" /><span className="confetti confetti-two" /><span className="confetti confetti-three" />
          <div className="automation-card">
            <div className="automation-head">
              <div><small>UPCOMING MOMENT</small><h3>Sarah&apos;s birthday</h3></div>
              <span className="date-tile"><b>09</b><small>AUG</small></span>
            </div>
            <div className="person-row">
              <span className="avatar avatar-coral">SJ</span>
              <div><b>Sarah Johnson</b><small>Senior Designer · Tomorrow</small></div>
              <span className="status-dot">Scheduled</span>
            </div>
            <div className="automation-flow">
              <div className="flow-step"><span><CakeSlice size={19} /></span><small>Birthday</small></div>
              <i><ArrowRight size={18} /></i>
              <div className="flow-step active"><span><Sparkles size={19} /></span><small>PerkJoy</small></div>
              <i><ArrowRight size={18} /></i>
              <div className="flow-step"><span><Gift size={19} /></span><small>$50 gift</small></div>
            </div>
            <div className="success-strip"><Check size={16} /> Reward queued for 9:00 AM tomorrow <span>Automatic</span></div>
          </div>
          <div className="floating-card floating-gift"><span><Gift size={18} /></span><div><small>REWARD DELIVERED</small><b>Employee choice · $50</b></div></div>
          <div className="floating-card floating-streak"><span><HeartHandshake size={18} /></span><div><small>CELEBRATION STREAK</small><b>12 moments remembered</b></div></div>
        </div>
      </section>

      <section className="recognition-band">
        <div className="shell section-grid">
          <div><div className="eyebrow eyebrow-light"><PartyPopper size={15} /> Recognition on autopilot</div><h2>Thoughtful appreciation,<br />without the mental load.</h2></div>
          <p>Build the rules once. PerkJoy watches the calendar, keeps spending on track, and makes every celebration feel personal.</p>
        </div>
        <div className="shell feature-grid">
          <article><span className="feature-icon coral"><CakeSlice /></span><b>Birthdays</b><p>Make their day with a gift that arrives exactly when it should.</p><small><Check size={14} /> Automatically scheduled</small></article>
          <article><span className="feature-icon gold"><Award /></span><b>Anniversaries</b><p>Celebrate every year of contribution, from one year to ten.</p><small><Check size={14} /> Tenure-aware rules</small></article>
          <article><span className="feature-icon green"><Trophy /></span><b>Everyday wins</b><p>Give managers a simple way to recognize great work in the moment.</p><small><Check size={14} /> Send in under a minute</small></article>
        </div>
      </section>

      <section className="section shell choices-section">
        <div className="section-heading"><span>CHOOSE HOW YOU CELEBRATE</span><h2>One place. Every kind of appreciation.</h2><p>From instant digital rewards to a cake from around the corner.</p></div>
        <div className="choice-grid">
          <article className="choice-card choice-orange"><div className="choice-art"><Gift size={42} /><span>$50</span></div><small>INSTANT & FLEXIBLE</small><h3>Digital Rewards</h3><p>Gift cards and employee-choice rewards delivered automatically.</p><a href="#pricing">Explore rewards <ArrowRight size={16} /></a></article>
          <article className="choice-card choice-cream"><div className="choice-art cake-art"><CakeSlice size={48} /><i>PHL</i></div><small>PHILADELPHIA FAVORITES</small><h3>PerkJoy Local</h3><p>Cakes, cupcakes, and thoughtful gifts from local makers.</p><a href="#local">Shop local gifts <ArrowRight size={16} /></a></article>
          <article className="choice-card choice-yellow"><div className="choice-art trophy-art"><Trophy size={46} /><Star size={18} /></div><small>RIGHT IN THE MOMENT</small><h3>Manager Recognition</h3><p>Send a meaningful reward for a job well done—right away.</p><Link href="/dashboard">See manager tools <ArrowRight size={16} /></Link></article>
        </div>
      </section>

      <section id="how" className="section how-section">
        <div className="shell how-wrap">
          <div className="section-heading left"><span>HOW IT WORKS</span><h2>Set it once.<br />Celebrate all year.</h2><p>PerkJoy turns your good intentions into a dependable recognition program.</p><Link className="button button-primary" href="/signup">Build your first rule <ArrowRight size={16} /></Link></div>
          <div className="steps">
            <article><b>01</b><span><CalendarDays /></span><div><h3>Add your team</h3><p>Import a CSV or add employees one by one. Birth years stay private and optional.</p></div></article>
            <article><b>02</b><span><Sparkles /></span><div><h3>Choose your celebration rules</h3><p>Pick the moments, rewards, budgets, and approval level that fit your company.</p></div></article>
            <article><b>03</b><span><Gift /></span><div><h3>PerkJoy handles the rest</h3><p>Rewards go out on time, managers stay informed, and every action is tracked.</p></div></article>
          </div>
        </div>
      </section>

      <section className="section shell preview-section">
        <div className="section-heading"><span>YOUR CELEBRATION COMMAND CENTER</span><h2>See every moment before it happens.</h2></div>
        <div className="dashboard-preview">
          <aside><Logo /><div className="preview-nav"><b>Overview</b><span>Employees</span><span>Celebrations</span><span>Rewards</span><span>PerkJoy Local</span></div></aside>
          <div className="preview-main">
            <div className="preview-title"><div><h3>Good morning, Taylor 👋</h3><p>Here&apos;s what&apos;s happening with your team.</p></div><button>+ Recognize someone</button></div>
            <div className="preview-kpis"><span><small>UPCOMING</small><b>8</b><em>Next 30 days</em></span><span><small>REWARDS SENT</small><b>12</b><em>This month</em></span><span><small>RECOGNITION SPEND</small><b>$425</b><em>of $500 budget</em></span></div>
            <div className="preview-list"><div className="preview-list-head"><b>Upcoming celebrations</b><small>View calendar →</small></div>
              <div><span className="avatar avatar-coral">SJ</span><p><b>Sarah Johnson</b><small>Birthday · Tomorrow</small></p><em className="pill coral-pill">$50 scheduled</em></div>
              <div><span className="avatar avatar-gold">MB</span><p><b>Marcus Brown</b><small>3 year anniversary · Aug 14</small></p><em className="pill gold-pill">Cake scheduled</em></div>
              <div><span className="avatar avatar-green">AW</span><p><b>Angela White</b><small>Birthday · Aug 18</small></p><em className="pill gray-pill">Choose reward</em></div>
            </div>
          </div>
        </div>
      </section>

      <section id="local" className="section local-section">
        <div className="shell local-wrap">
          <div className="local-copy"><div className="eyebrow"><MapPin size={15} /> Now serving Philadelphia</div><h2>Make employee appreciation feel local.</h2><p>Send a locally made cake, box of cookies, or team treat—without juggling vendor calls and delivery details.</p><ul><li><Check /> Curated local makers</li><li><Check /> Delivery coordinated by PerkJoy</li><li><Check /> One simple company receipt</li></ul><Link className="button button-dark" href="/perkjoy-local">Explore PerkJoy Local <ArrowRight size={16} /></Link><small className="demo-note">Catalog vendors shown in this demo are illustrative and not represented as partners.</small></div>
          <div className="product-stack"><article className="product-hero"><span className="bakery-label">DEMO PHILADELPHIA BAKERY</span><div className="cake-shape"><i /><i /><b>Celebrate!</b></div><div><small>BIRTHDAY CAKES</small><h3>Sunshine Celebration Cake</h3><p>Serves 8–10 · Delivery available</p><b>From $49</b></div></article><article className="mini-product"><span>🍪</span><div><small>TEAM FAVORITE</small><b>Local cookie box</b><p>Delivered across Philadelphia</p></div></article></div>
        </div>
      </section>

      <section id="pricing" className="section shell pricing-section">
        <div className="section-heading"><span>SIMPLE, TRANSPARENT PRICING</span><h2>Start small. Celebrate more as you grow.</h2><p>Reward costs are always separate, so you only pay for what you send.</p></div>
        <div className="pricing-grid">
          {plans.map((plan) => <article className={plan.featured ? "featured-plan" : ""} key={plan.name}>{plan.featured && <i>Most popular</i>}<small>{plan.name}</small><h3>{plan.price}<span>/month</span></h3><p>{plan.people}</p><hr /><ul><li><Check /> Automated celebrations</li><li><Check /> Digital & local rewards</li><li><Check /> Budget controls</li><li><Check /> Activity reports</li></ul><Link className={`button ${plan.featured ? "button-primary" : "button-secondary"}`} href="/signup">Start trial</Link></article>)}
          <article className="enterprise-plan"><small>Enterprise</small><h3>Let&apos;s talk</h3><p>Custom programs for teams with more than 100 employees.</p><Link className="button button-dark" href="mailto:hello@perkjoy.app">Contact sales</Link></article>
        </div>
      </section>

      <section className="section faq-section shell">
        <div className="section-heading left"><span>COMMON QUESTIONS</span><h2>A few things you might be wondering.</h2></div>
        <div className="faq-list">{[
          ["Can we approve rewards before they go out?", "Yes. Choose automatic, approval required, or reminder-only mode for your organization."],
          ["Do employees need a PerkJoy account?", "No. Employees receive their recognition by email and can redeem digital rewards without an account."],
          ["Can we set a monthly budget?", "Yes. Set a monthly recognition budget and choose whether PerkJoy warns or blocks spending above it."],
          ["Are local bakery orders automatic?", "PerkJoy coordinates local orders through our fulfillment queue, so every delivery is confirmed by a human."],
        ].map(([q, a], i) => <details key={q} open={i === 0}><summary>{q}<ChevronDown /></summary><p>{a}</p></details>)}</div>
      </section>

      <section className="cta-section"><div className="shell"><div><Sparkles /><h2>Your team&apos;s next big moment<br />is already on the calendar.</h2><p>Make sure it feels remembered.</p><Link className="button button-light button-large" href="/signup">Start your trial <ArrowRight size={18} /></Link></div></div></section>

      <footer><div className="shell footer-top"><div><Logo inverse /><p>Employee appreciation on autopilot.</p></div><div><b>Product</b><a href="#how">How it works</a><Link href="/dashboard">Dashboard</Link><a href="#pricing">Pricing</a></div><div><b>Company</b><a href="mailto:hello@perkjoy.app">Contact</a><a href="#">Privacy</a><a href="#">Terms</a></div><div><b>Sign in</b><Link href="/login">Company login</Link><Link href="/perkjoy-admin">Admin login</Link></div></div><div className="shell footer-bottom"><span>© 2026 PerkJoy. Made with care in Philadelphia.</span><span>Philadelphia, PA <span className="live-dot" /> Systems happy</span></div></footer>
    </main>
  );
}
