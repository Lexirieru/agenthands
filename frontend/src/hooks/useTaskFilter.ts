'use client';
import { useState, useMemo } from 'react';
import type { TaskData } from '@/types/task';

/**
 * Encapsulates filter + search state for the task list.
 * Returns the filtered slice of `tasks` together with the current filter values
 * and setter functions.
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
