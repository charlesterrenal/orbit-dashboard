import { useState, useEffect } from 'react';
import { Star, GitFork, GitCommitHorizontal, GitPullRequest, Clock } from 'lucide-react';

const USERNAME = import.meta.env.VITE_GITHUB_USERNAME || 'charlesterrenal';

const LANG_COLORS = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  CSS: '#563d7c',
  HTML: '#e44b23',
  default: 'var(--text-subtle)',
};

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const eventLabel = (event) => {
  switch (event.type) {
    case 'PushEvent': return { label: `pushed to ${event.payload?.ref?.replace('refs/heads/', '') || 'main'}`, Icon: GitCommitHorizontal };
    case 'PullRequestEvent': return { label: `opened a PR in ${event.repo?.name?.split('/')[1]}`, Icon: GitPullRequest };
    case 'CreateEvent': return { label: `created ${event.payload?.ref_type} ${event.payload?.ref || ''}`, Icon: GitFork };
    default: return { label: event.type.replace('Event', ''), Icon: Clock };
  }
};

const GithubWidget = () => {
  const [repos, setRepos] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reposRes, eventsRes] = await Promise.all([
          fetch(`https://api.github.com/users/${USERNAME}/repos?sort=updated&per_page=3`),
          fetch(`https://api.github.com/users/${USERNAME}/events/public?per_page=5`),
        ]);
        if (!reposRes.ok) throw new Error('GitHub API error');
        const reposData = await reposRes.json();
        const eventsData = await eventsRes.json();
        setRepos(reposData.slice(0, 3));
        // Filter for meaningful events only
        const meaningful = eventsData.filter(e => ['PushEvent', 'PullRequestEvent', 'CreateEvent'].includes(e.type));
        setEvents(meaningful.slice(0, 3));
      } catch (e) {
        setError('GitHub data unavailable');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="widget">
        <div className="widget-title">github</div>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '40px', borderRadius: '8px', marginBottom: '8px' }} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="widget">
        <div className="widget-title">github</div>
        <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="widget">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', minHeight: '20px' }}>
        <div className="widget-title" style={{ margin: 0 }}>github · {USERNAME}</div>
      </div>

      <div className="card" style={{ padding: '20px' }}>

      {/* Recent repos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {repos.map(repo => {
          const langColor = LANG_COLORS[repo.language] || LANG_COLORS.default;
          return (
            <a
              key={repo.id}
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                transition: 'background-color var(--transition-fast)',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {repo.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-subtle)' }}>
                      <Star size={10} /> {repo.stargazers_count}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-subtle)' }}>
                      <GitFork size={10} /> {repo.forks_count}
                    </span>
                  </div>
                </div>
                {repo.language && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-subtle)' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: langColor, display: 'inline-block' }} />
                    {repo.language}
                  </span>
                )}
              </div>
            </a>
          );
        })}
      </div>

      {/* Recent activity */}
      {events.length > 0 && (
        <>
          <div style={{ fontSize: '9px', fontWeight: '600', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '8px' }}>
            recent activity
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {events.map((ev, i) => {
              const { label, Icon } = eventLabel(ev);
              return (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <Icon size={12} style={{ color: 'var(--text-subtle)', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-subtle)', marginLeft: '6px' }}>{timeAgo(ev.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default GithubWidget;
