export const Chat: React.FC = () => {
  return (
    <div className="relative flex h-full min-w-0 flex-col">
    <div className="absolute bottom-4 left-1/2 w-full max-w-3xl -translate-x-1/2 px-4">
      <h1 className="text-center text-white mb-4">Chat Application</h1>
      <div className="min-h-[100px] min-w-[200px] bg-gray-700 rounded-lg p-4">
        <p className="text-white">Example content</p>
      </div>
    </div>
  </div>
  );
};