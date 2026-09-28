'use dom';

export default function LiveStreamPlayer({ videoId }: { videoId: string }) {
  return (
    <div style={{ width: '100%', aspectRatio: '16 / 9', background: '#111', borderRadius: 16, overflow: 'hidden' }}>
      <iframe
        title="Red Point Church live stream"
        src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1&rel=0`}
        style={{ width: '100%', height: '100%', border: 0 }}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
