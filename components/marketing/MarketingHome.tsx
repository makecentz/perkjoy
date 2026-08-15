import type { AnchorHTMLAttributes } from "react";
import {
  ArrowRight, Award, CakeSlice, CalendarDays, Check, ChevronDown,
  Gift, HeartHandshake, HeartPulse, MapPin, PartyPopper, Sparkles, Star, Trophy,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SocialProofToast } from "@/components/marketing/SocialProofToast";

function Link({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a href={href} {...props}>{children}</a>;
}

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
          <a href="#how">How it works</a><Link href="/perkjoy-local">PerkJoy Local</Link><a href="#pricing">Pricing</a>
        </div>
        <div className="nav-actions">
          <Link className="button button-ghost" href="/login">Log in</Link>
          <Link className="button button-primary button-small" href="/signup">Start Celebrating <ArrowRight size={15} /></Link>
        </div>
      </nav>

      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15} /> Employee celebrations on autopilot</div>
          <h1>Never miss a moment <span>worth celebrating.</span></h1>
          <p>PerkJoy remembers your employees&apos; birthdays, anniversaries, and accomplishments—then turns them into personalized rewards, locally delivered gifts, and memorable experiences.</p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" href="/signup">Start Celebrating <ArrowRight size={18} /></Link>
            <a className="button button-secondary button-large" href="#how">See How PerkJoy Works</a>
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
            <div className="success-strip"><Check size={16} /> PerkJoy has this handled <span>4 steps confirmed</span></div>
          </div>
          <div className="floating-card floating-gift"><span><Gift size={18} /></span><div><small>REWARD DELIVERED</small><b>Employee choice · $50</b></div></div>
          <div className="floating-card floating-streak"><span><HeartHandshake size={18} /></span><div><small>MOMENTS HANDLED</small><b>12 celebrations on track</b></div></div>
        </div>
      </section>

      <section className="phase-a-promise" aria-label="PerkJoy promise">
        <div className="shell">
          <p>You hire the people. <strong>PerkJoy remembers the moments.</strong></p>
          <div><span>Remember</span><ArrowRight size={14} /><span>Personalize</span><ArrowRight size={14} /><span>Celebrate</span><ArrowRight size={14} /><span>Deliver</span></div>
        </div>
      </section>

      <section className="recognition-band">
        <div className="shell section-grid">
          <div><div className="eyebrow eyebrow-light"><PartyPopper size={15} /> The moments matter</div><h2>Your employees remember<br />when you remember them.</h2></div>
          <p>Running a business is busy. Birthdays get missed. Anniversaries slip by. Great work goes unnoticed. PerkJoy makes sure important moments don&apos;t.</p>
        </div>
        <div className="shell feature-grid">
          <article><span className="feature-icon coral"><CakeSlice /></span><b>Birthdays</b><p>Make their day with a gift that arrives exactly when it should.</p><small><Check size={14} /> Automatically scheduled</small></article>
          <article><span className="feature-icon gold"><Award /></span><b>Anniversaries</b><p>Celebrate every year of contribution, from one year to ten.</p><small><Check size={14} /> Tenure-aware rules</small></article>
          <article><span className="feature-icon green"><Trophy /></span><b>Everyday wins</b><p>Give managers a simple way to recognize great work in the moment.</p><small><Check size={14} /> Send in under a minute</small></article>
          <article><span className="feature-icon coral"><HeartPulse /></span><b>Get well soon</b><p>Send a thoughtful gift or reward to an employee recovering away from work.</p><small><Check size={14} /> Home delivery supported</small></article>
        </div>
      </section>

      <section className="section shell choices-section">
        <div className="section-heading"><span>CHOOSE HOW YOU CELEBRATE</span><h2>One place. Every kind of appreciation.</h2><p>From instant digital rewards to a cake from around the corner.</p></div>
        <div className="choice-grid">
          <article className="choice-card choice-orange"><div className="choice-art"><Gift size={42} /><span>$50</span></div><small>PERFECT WHEN DIGITAL MAKES SENSE</small><h3>Digital Rewards</h3><p>Ideal for remote employees, instant recognition, last-minute moments, and employee preference.</p><Link href="/rewards">Explore rewards <ArrowRight size={16} /></Link></article>
          <article className="choice-card choice-cream"><div className="choice-art cake-art"><CakeSlice size={48} /><i>PHL</i></div><small>PHILADELPHIA FAVORITES</small><h3>PerkJoy Local</h3><p>Cakes, cupcakes, and thoughtful gifts from local makers.</p><Link href="/perkjoy-local">Shop local gifts <ArrowRight size={16} /></Link></article>
          <article className="choice-card choice-yellow"><div className="choice-art trophy-art"><Trophy size={46} /><Star size={18} /></div><small>RIGHT IN THE MOMENT</small><h3>Manager Recognition</h3><p>Send a meaningful reward for a job well done—right away.</p><Link href="/dashboard">See manager tools <ArrowRight size={16} /></Link></article>
        </div>
      </section>

      <section id="how" className="section how-section">
        <div className="shell how-wrap">
          <div className="section-heading left"><span>REMEMBER → PERSONALIZE → CELEBRATE → DELIVER</span><h2>Never miss<br />the moment.</h2><p>PerkJoy turns good intentions into a celebration system your company can trust.</p><Link className="button button-primary" href="/signup">Start Celebrating <ArrowRight size={16} /></Link></div>
          <div className="steps">
            <article><b>01</b><span><CalendarDays /></span><div><h3>PerkJoy remembers.</h3><p>Birthdays, anniversaries, career milestones, life events, and everyday wins.</p></div></article>
            <article><b>02</b><span><Sparkles /></span><div><h3>PerkJoy chooses.</h3><p>A digital reward, local gift, or personalized experience based on what they like.</p></div></article>
            <article><b>03</b><span><Gift /></span><div><h3>PerkJoy delivers.</h3><p>Automatically, on time, without HR chasing it—and with every step tracked.</p></div></article>
          </div>
        </div>
      </section>

      <section className="section shell preview-section">
        <div className="section-heading"><span>YOUR CELEBRATION COMMAND CENTER</span><h2>See every moment before it happens.</h2></div>
        <div className="dashboard-preview">
          <aside><Logo /><div className="preview-nav"><Link className="active" href="/dashboard">Overview</Link><Link href="/employees">Employees</Link><Link href="/celebrations">Celebrations</Link><Link href="/rewards">Rewards</Link><Link href="/perkjoy-local">PerkJoy Local</Link></div></aside>
          <div className="preview-main">
            <div className="preview-title"><div><h3>PerkJoy has this handled.</h3><p>You hire the people. PerkJoy remembers the moments.</p></div><Link href="/dashboard">+ Celebrate Someone</Link></div>
            <div className="preview-kpis"><span><small>MOMENTS HANDLED</small><b>3</b><em>Every detail confirmed</em></span><span><small>NEEDS ATTENTION</small><b>1</b><em>One quick decision</em></span><span><small>CELEBRATION HEALTH</small><b>75%</b><em>3 of 4 on track</em></span></div>
            <div className="preview-list"><div className="preview-list-head"><b>What&apos;s Coming Up</b><Link href="/celebrations">Open calendar →</Link></div>
              <div><span className="avatar avatar-coral">SJ</span><p><b>Sarah Johnson</b><small>Birthday · Tomorrow</small></p><em className="pill handled-pill">Handled</em></div>
              <div><span className="avatar avatar-gold">MB</span><p><b>Marcus Brown</b><small>5 year anniversary · Aug 14</small></p><em className="pill scheduled-pill">Scheduled</em></div>
              <div><span className="avatar avatar-green">NW</span><p><b>Nicole Williams</b><small>Birthday · In 5 days</small></p><em className="pill attention-pill">Needs Attention</em></div>
            </div>
          </div>
        </div>
      </section>

      <section id="local" className="section local-section">
        <div className="shell local-wrap">
          <div className="local-copy"><div className="eyebrow"><MapPin size={15} /> Now launching in Philadelphia</div><h2>Send more than another gift card.</h2><p>With PerkJoy Local, companies can celebrate employees with cakes, treats, flowers, lunches, coffee, gift boxes, and experiences from businesses in their city.</p><ul><li><Check /> Cake & cupcakes</li><li><Check /> Flowers & team lunches</li><li><Check /> Delivery coordinated by PerkJoy</li></ul><Link className="button button-dark" href="/perkjoy-local">Explore PerkJoy Local <ArrowRight size={16} /></Link><small className="demo-note">Catalog vendors shown in this demo are illustrative and not represented as partners.</small></div>
          <div className="product-stack"><article className="product-hero"><span className="bakery-label">DEMO PHILADELPHIA BAKERY</span><div className="cake-shape"><i /><i /><b>Celebrate!</b></div><div><small>BIRTHDAY CAKES</small><h3>Sunshine Celebration Cake</h3><p>Serves 8–10 · Delivery available</p><b>From $49</b></div></article><article className="mini-product"><span>🍪</span><div><small>TEAM FAVORITE</small><b>Local cookie box</b><p>Delivered across Philadelphia</p></div></article></div>
        </div>
      </section>

      <section id="pricing" className="section shell pricing-section">
        <div className="section-heading"><span>SIMPLE, TRANSPARENT PRICING</span><h2>Start small. Celebrate more as you grow.</h2><p>Reward costs are always separate, so you only pay for what you send.</p></div>
        <div className="pricing-grid">
          {plans.map((plan) => <article className={plan.featured ? "featured-plan" : ""} key={plan.name}>{plan.featured && <i>Most popular</i>}<small>{plan.name}</small><h3>{plan.price}<span>/month</span></h3><p>{plan.people}</p><hr /><ul><li><Check /> Automated celebrations</li><li><Check /> Digital & local rewards</li><li><Check /> Budget controls</li><li><Check /> Activity reports</li></ul><Link className={`button ${plan.featured ? "button-primary" : "button-secondary"}`} href="/signup">Start Celebrating</Link></article>)}
          <article className="enterprise-plan"><small>Enterprise</small><h3>Let&apos;s talk</h3><p>Custom programs for teams with more than 100 employees.</p><Link className="button button-dark" href="/contact">Contact sales</Link></article>
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

      <section className="cta-section"><div className="shell"><div><Sparkles /><h2>Your team&apos;s next big moment<br />is already on the calendar.</h2><p>PerkJoy remembers it. Personalizes it. Helps deliver it.</p><Link className="button button-light button-large" href="/signup">Start Celebrating <ArrowRight size={18} /></Link></div></div></section>

      <footer><div className="shell footer-top"><div><Logo inverse /><p>Employee celebrations on autopilot.</p></div><div><b>Product</b><a href="#how">How it works</a><Link href="/dashboard">Dashboard</Link><a href="#pricing">Pricing</a></div><div><b>Company</b><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div><div><b>Sign in</b><Link href="/login">Company login</Link><Link href="/perkjoy-admin">Admin login</Link></div></div><div className="shell footer-bottom"><span>© 2026 PerkJoy. Made with care in Philadelphia.</span><span>Philadelphia, PA <span className="live-dot" /> Systems happy</span></div></footer>
      <SocialProofToast />
    </main>
  );
}
