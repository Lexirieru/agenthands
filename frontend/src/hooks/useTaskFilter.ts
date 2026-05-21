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
 * physical task locations posted by Celo AI agents. Matching is
 * case-insensitive substring search (`includes` after `toLowerCase`).
 * All three fields are tested in parallel, so a single keyword can
 * match a city name in `location`, a skill in `title`, or any phrasing
 * in `description`.
 *
 * `clearFilters` resets both `filter` back to `'all'` and `search` back
 * to the empty string in a single state flush, so callers don't need to
 * call `setFilter` and `setSearch` separately.
 *
 * Returns the filtered task slice together with setters and `clearFilters`.
 *
 * @since 1.0.0
 * @param tasks Pre-fetched `TaskData[]` array from `useAllTasks` on Celo.
 * @returns Filter state, setters, filtered task slice, and `clearFilters` helper.
 */
export function useTaskFilter(tasks: TaskData[]) {
  /** Current TaskStatus filter; 'all' skips status filtering on Celo task feed. */
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
