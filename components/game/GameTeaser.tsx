import Link from "next/link";
import { ArrowRight, CakeSlice, Clock3, Gamepad2, Gift, HeartPulse, Sparkles, Trophy, Zap } from "lucide-react";
import { CharacterSprite } from "./CharacterSprite";
import styles from "./office-rush.module.css";

export function GameTeaser() {
  return (
    <section className={styles.teaserSection} aria-labelledby="office-rush-heading">
      <div className={`shell ${styles.teaserGrid}`}>
        <div className={styles.teaserCopy}>
          <span><Gamepad2 /> Free Browser Game</span>
          <h2 id="office-rush-heading">Think You&apos;d Remember Everyone?</h2>
          <p>Put your people skills to the test. Keep birthdays, milestones, rewards, and deliveries from slipping through the cracks.</p>
          <div><Link className="button button-primary button-large" href="/game">Play Here <ArrowRight /></Link><a className="button button-secondary button-large" href="#how">Learn About PerkJoy</a></div>
          <small>Free browser game · No download required</small>
        </div>
        <div className={styles.teaserScene} aria-label="PerkJoy Office Rush game preview">
          <header><span><HeartPulse /> Team Morale <i><b /></i><strong>94%</strong></span><span><Clock3 /> 01:47</span></header>
          <div className={`${styles.previewCharacter} ${styles.previewJordan}`}><CharacterSprite character="jordan" /><small>JORDAN</small></div>
          <div className={`${styles.previewCharacter} ${styles.previewAlex}`}><span className={styles.previewEvent}><CakeSlice /> 00:18</span><CharacterSprite character="alex" /><small>ALEX</small></div>
          <div className={`${styles.previewCharacter} ${styles.previewTaylor}`}><span className={styles.previewEvent}><Trophy /> 00:12</span><CharacterSprite character="taylor" /><small>TAYLOR</small></div>
          <div className={`${styles.previewCharacter} ${styles.previewRiley}`}><CharacterSprite character="riley" /><small>RILEY</small><i><Gift /></i></div>
          <div className={styles.previewAutomation}><Zap /><span><small>PERKJOY AUTOMATION</small><b>Appreciation on autopilot</b></span><Sparkles /></div>
          <span className={`${styles.previewBalloon} ${styles.balloonOne}`} /><span className={`${styles.previewBalloon} ${styles.balloonTwo}`} /><span className={`${styles.previewBalloon} ${styles.balloonThree}`} />
        </div>
      </div>
    </section>
  );
}
