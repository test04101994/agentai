export default function StatusBadge({ percentage }) {
  let className = 'badge';
  if (percentage > 100) className += ' badge-danger';
  else if (percentage === 100) className += ' badge-success';
  else if (percentage >= 75) className += ' badge-warning';
  else className += ' badge-info';

  return <span className={className}>{percentage}%</span>;
}
