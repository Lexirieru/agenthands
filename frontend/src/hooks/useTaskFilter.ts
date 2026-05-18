'use client';
import { useState, useMemo } from 'react';
import type { TaskData } from '@/types/task';

/**
 * Encapsulate filter + search state for the Celo AgentHands task list.
 *
 * The `filter` value maps directly to the on-chain `TaskStatus` enum:
 *   0 = Open, 1 = Accepted, 2 = Submitted, 3 = Completed,
 *   4 = Disputed, 5 = Cancelled, 6 = Expired, `'all'` = no filter.
 *
 * The `search` string matches against `title`, `description`, and
 * `location` fields stored on-chain, enabling keyword search across
 * physical task locations posted by Celo AI agents.
 *
 * Returns the filtered task slice together with setters and `clearFilters`.
 */
export function useTaskFilter(tasks: TaskData[]) {
  const [filter, setFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');

  const filteredTasks = useMemo(
    () =>
      tasks
        .filter((t) => filter === 'all' || Number(t.status) === filter)
        .filter(
          (t) =>
            !search ||
            t.title.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase()) ||
            t.location.toLowerCase().includes(search.toLowerCase())
        ),
    [tasks, filter, search]
  );

  const clearFilters = () => {
    setFilter('all');
    setSearch('');
  };

  return { filter, setFilter, search, setSearch, filteredTasks, clearFilters };
}
