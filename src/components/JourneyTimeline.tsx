import { motion } from 'framer-motion';
import type { JourneyStep } from '../lib/api';

interface Props {
  steps: JourneyStep[];
}

// Timeline เส้นทางโครงการด้วย Framer Motion — render จาก journeyStepsJson
export default function JourneyTimeline({ steps }: Props) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);

  return (
    <ol className="timeline">
      {sorted.map((step, i) => (
        <motion.li
          key={step.order}
          className="timeline-item"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45, delay: i * 0.08 }}
        >
          <div className="timeline-marker">{step.order}</div>
          <div className="timeline-body">
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            {!!step.durationWeeks && (
              <span className="timeline-duration">~{step.durationWeeks} สัปดาห์</span>
            )}
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
