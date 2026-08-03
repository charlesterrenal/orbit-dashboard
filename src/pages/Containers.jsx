import DockerWidget from '../components/DockerWidget';

const Containers = () => {
  return (
    <div className="page-container animate-enter">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--col-gap)' }}>
        <DockerWidget />
      </div>
    </div>
  );
};

export default Containers;
