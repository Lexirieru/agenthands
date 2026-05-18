'use client';
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import TaskCard from '@/components/TaskCard';
import type { TaskData } from '@/types/task';

interface TaskGridProps {
  tasks: TaskData[];
  search?: string;
  onClearFilters?: () => void;
}

/**
 * Desktop 3-column task grid for the Celo AgentHands task marketplace.
 *
 * Receives an already-filtered and paginated task slice from the parent
 * (via `useTaskFilter` + pagination state) and renders each task as a
 * `TaskCard`. GSAP animates newly-rendered cards with a staggered
 * `opacity: 0 → 1 + y: 20 → 0` fade-in using a `.task-card` selector
 * scoped to a `gsap.context` so cleanup is automatic on unmount.
 *
 * The empty-state panel surfaces a "No results" message and an optional
 * "Clear filters" button when `onClearFilters` is provided, so users can
 * reset after searching for Celo tasks by location or keyword.
 */
export default function TaskGrid({ tasks, search, onClearFilters }: TaskGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gridRef.current && tasks.length > 0) {
      const ctx = gsap.context(() => {
        gsap.from('.task-card', { opacity: 0, y: 20, duration: 0.4, stagger: 0.05, ease: 'power2.out' });
      }, gridRef);
      return () => ctx.revert();
    }
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-24 text-[#8B4513]">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-xl font-heading text-[#5C2D0A]">No tasks found</p>
        <p className="text-sm mt-2 text-[#8B4513]">
          {search ? `No results for "${search}"` : 'No tasks match the selected filter.'}
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-[#5C2D0A] text-white hover:bg-[#7A3D0F] transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task, i) => (
        <div key={task.id?.toString() || i} className="task-card">
          <TaskCard
            id={task.id || BigInt(i + 1)}
            title={task.title}
            description={task.description}
            location={task.location}
            reward={task.reward}
            deadline={task.deadline}
            status={Number(task.status)}
            agent={task.agent}
            paymentToken={task.paymentToken}
          />
        </div>
      ))}
    </div>
  );
}
