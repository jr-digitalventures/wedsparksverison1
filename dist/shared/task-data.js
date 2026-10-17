import { supabase } from './supabase-client.js';

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function dateLabel(value) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-AU',
    { day:'numeric', month:'short', year:'numeric' }) : 'No due date';
}
export function isOverdue(task) {
  return task.status !== 'completed' && !!task.due_date && task.due_date < todayKey();
}
export function orderedTasks(tasks) {
  return [...tasks].sort((a,b) =>
    Number(a.status === 'completed') - Number(b.status === 'completed') ||
    (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31') ||
    Number(b.priority === 'high') - Number(a.priority === 'high') ||
    a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}
export async function fetchTasks(owner) {
  const tasks = [];
  for (;;) {
    const { data, count, error } = await supabase.from('couple_tasks')
      .select('*,supplier:"Vendor Public Profiles"(vendor_id,"Name of Wedding Vendor")', {count:'exact'})
      .eq('user_id', owner).order('id').range(tasks.length, tasks.length + 499);
    if (error || !Array.isArray(data) || count == null) throw new Error('Could not load tasks.');
    tasks.push(...data);
    if (tasks.length >= count) return tasks;
    if (!data.length) throw new Error('Task results were incomplete. Please refresh.');
  }
}
export async function fetchSavedSuppliers(owner) {
  const rows = [];
  for (;;) {
    const {data, count, error} = await supabase.from('saved_suppliers')
      .select('vendor_id,supplier:"Vendor Public Profiles"(vendor_id,"Name of Wedding Vendor")', {count:'exact'})
      .eq('user_id', owner).order('vendor_id').range(rows.length, rows.length + 499);
    if (error || !Array.isArray(data) || count == null) throw new Error();
    rows.push(...data);
    if (rows.length >= count) return rows.filter(row => row.supplier)
      .sort((a,b) => a.supplier['Name of Wedding Vendor'].localeCompare(b.supplier['Name of Wedding Vendor']));
    if (!data.length) throw new Error();
  }
}
export async function writeTask(owner, changes, original = null) {
  const query = original
    ? supabase.from('couple_tasks').update(changes).eq('user_id',owner)
      .eq('id',original.id).eq('updated_at',original.updated_at)
    : supabase.from('couple_tasks').insert({...changes,user_id:owner});
  const {data,error} = await query.select('id');
  if (error) throw new Error('Could not confirm the save. Refresh your tasks before trying again.');
  if (data?.length !== 1) throw new Error('This task changed elsewhere or is no longer available. Refresh before editing again.');
}
export async function deleteTask(owner, original) {
  const {data,error} = await supabase.from('couple_tasks').delete()
    .eq('user_id',owner).eq('id',original.id).eq('updated_at',original.updated_at).select('id');
  if (error || data?.length !== 1) throw new Error('Could not confirm deletion. Refresh your tasks before trying again.');
}
