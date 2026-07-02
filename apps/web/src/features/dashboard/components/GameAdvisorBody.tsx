import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  route: string;
}

function priorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'border-accent-danger/40 bg-accent-danger/5';
    case 'medium':
      return 'border-accent-warning/40 bg-accent-warning/5';
    default:
      return 'border-dynasty-border bg-dynasty-elevated/30';
  }
}

function priorityDot(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-accent-danger';
    case 'medium':
      return 'bg-accent-warning';
    default:
      return 'bg-accent-info';
  }
}

export default function GameAdvisorBody({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  const [expanded, setExpanded] = useState(true);

  if (recommendations.length === 0) return null;

  return (
    <section className="rounded-xl border border-accent-info/20 bg-accent-info/5 p-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-accent-info" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
            What should I do?
          </h2>
          <span className="rounded-full bg-accent-info/20 px-2 py-0.5 font-data text-[10px] text-accent-info">
            {recommendations.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-dynasty-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-dynasty-muted" />
        )}
      </button>

      {expanded ? (
        <div className="mt-3 space-y-2">
          {recommendations.map((rec) => (
            <Link
              key={rec.id}
              to={rec.route}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-accent-primary/40 ${priorityColor(rec.priority)}`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot(rec.priority)}`} />
              <div className="min-w-0 flex-1">
                <div className="font-heading text-xs font-medium text-dynasty-textBright">
                  {rec.title}
                </div>
                <div className="mt-0.5 font-data text-[10px] text-dynasty-muted">
                  {rec.description}
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-dynasty-muted" />
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
