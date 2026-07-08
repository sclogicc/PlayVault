import { useParams } from 'react-router-dom'

export default function GameDetail(): React.ReactElement {
  const { gameId } = useParams<{ gameId: string }>()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-archive-100">游戏详情</h2>
      <div className="card text-center py-12">
        <p className="text-archive-500">
          游戏详情页将在第 2 轮实现 —— 展示游戏信息、全部 Session、截图墙
        </p>
        <p className="text-archive-600 text-sm mt-2">游戏 ID: {gameId}</p>
      </div>
    </div>
  )
}
