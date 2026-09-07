/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  
  redirects() {
    return [
      {
        source: '/docs',
        destination: 'https://docs.netlify.com/frameworks/next-js/overview/',
        permanent: false,
      },
      {
        source: '/old-blog/:slug',
        destination: '/classics',
        permanent: true,
      },
      {
        source: '/github',
        destination: 'https://github.com/netlify-templates/next-platform-starter',
        permanent: false,
      },
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        // The hexagon frame used to be one product with two colourways.
        // Each colourway is its own product now; keep the old link alive.
        source: '/product/hexa',
        destination: '/product/hexa-noir',
        permanent: true,
      },
    ];
  },
  
  rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/quotes/random',
      },
      {
        source: '/blog',
        destination: '/classics',
      },
    ];
  },
};

export default nextConfig;
