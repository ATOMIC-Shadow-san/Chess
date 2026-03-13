import { BoardState } from './engine';

export interface Tutorial {
  id: string;
  name: string;
  description: string;
  initialBoard: BoardState;
}

function createEmptyBoard(): BoardState {
  return Array(10).fill(null).map(() => Array(9).fill(null));
}

export const TUTORIALS: Tutorial[] = [
  {
    id: 'shuang-ma-yin-quan',
    name: '雙馬飲泉',
    description: '雙馬相依，輪番抽將，一馬控制將門，另一馬切入九宮。請跳馬完成絕殺！(1步殺)',
    initialBoard: (() => {
      const b = createEmptyBoard();
      b[0][4] = { type: 'k', color: 'black' };
      b[0][3] = { type: 'a', color: 'black' };
      b[1][4] = { type: 'a', color: 'black' };
      b[2][3] = { type: 'h', color: 'red' }; // Controlling horse
      b[2][5] = { type: 'h', color: 'red' }; // Move to 0,6 or 1,7
      b[9][4] = { type: 'k', color: 'red' };
      return b;
    })()
  },
  {
    id: 'ma-hou-pao',
    name: '馬後炮',
    description: '馬作炮架，居後封鎖將的後退與左右移動，炮配合成殺。請移動紅炮完成絕殺！(1步殺)',
    initialBoard: (() => {
      const b = createEmptyBoard();
      b[0][4] = { type: 'k', color: 'black' };
      b[0][3] = { type: 'a', color: 'black' };
      b[1][4] = { type: 'a', color: 'black' };
      b[2][4] = { type: 'h', color: 'red' };
      b[5][5] = { type: 'c', color: 'red' }; // Move to 5,4
      b[9][4] = { type: 'k', color: 'red' };
      return b;
    })()
  },
  {
    id: 'tie-men-shuan',
    name: '鐵門閂',
    description: '炮鎮中路，車封堵肋道，借帥（將）之力將對方死鎖。請移動紅車完成絕殺！(1步殺)',
    initialBoard: (() => {
      const b = createEmptyBoard();
      b[0][4] = { type: 'k', color: 'black' };
      b[0][3] = { type: 'a', color: 'black' };
      b[1][4] = { type: 'a', color: 'black' };
      b[7][4] = { type: 'c', color: 'red' };
      b[2][5] = { type: 'r', color: 'red' }; // Move to 0,5
      b[9][5] = { type: 'k', color: 'red' }; // Protects rook at 0,5
      return b;
    })()
  },
  {
    id: 'wo-cao-ma',
    name: '臥槽馬',
    description: '馬跳至對方底象前一格（臥槽點），配合車、炮等形成絕殺。請跳馬完成絕殺！(1步殺)',
    initialBoard: (() => {
      const b = createEmptyBoard();
      b[0][4] = { type: 'k', color: 'black' };
      b[0][3] = { type: 'a', color: 'black' };
      b[0][7] = { type: 'r', color: 'red' };
      b[2][4] = { type: 'p', color: 'red' };
      b[3][7] = { type: 'h', color: 'red' }; // Move to 1,6
      b[9][4] = { type: 'k', color: 'red' };
      return b;
    })()
  },
  {
    id: 'ba-jiao-ma',
    name: '八角馬',
    description: '馬位於九宮的士角處，與將形成對角，使其無法動彈，再由他子成殺。請移動紅車完成絕殺！(1步殺)',
    initialBoard: (() => {
      const b = createEmptyBoard();
      b[0][4] = { type: 'k', color: 'black' };
      b[2][3] = { type: 'h', color: 'red' }; // Eight-angle horse
      b[1][5] = { type: 'r', color: 'red' }; // Move to 0,5
      b[9][4] = { type: 'k', color: 'red' };
      return b;
    })()
  },
  {
    id: 'bai-lian-jiang',
    name: '白臉將（對面笑）',
    description: '利用帥與將不能直接對面的規則，以一車直接將死對方。請移動紅車完成絕殺！(1步殺)',
    initialBoard: (() => {
      const b = createEmptyBoard();
      b[0][4] = { type: 'k', color: 'black' };
      b[0][3] = { type: 'a', color: 'black' };
      b[2][5] = { type: 'r', color: 'red' }; // Move to 0,5
      b[9][4] = { type: 'k', color: 'red' }; // Face to face
      return b;
    })()
  },
  {
    id: 'bai-ma-xian-ti',
    name: '白馬現蹄',
    description: '棄車引離，使對方士角防守失控，利用下二路橫線的馬「掛角」將死。請跳馬完成絕殺！(1步殺)',
    initialBoard: (() => {
      const b = createEmptyBoard();
      b[0][4] = { type: 'k', color: 'black' };
      b[0][5] = { type: 'a', color: 'black' };
      b[2][5] = { type: 'h', color: 'red' }; // Move to 0,6
      b[9][4] = { type: 'k', color: 'red' };
      return b;
    })()
  },
  {
    id: 'diao-yu-ma',
    name: '釣魚馬',
    description: '馬在對方「三·三」或「七·三」位置控制將的活動，配合車或兵致勝。請移動紅車完成絕殺！(1步殺)',
    initialBoard: (() => {
      const b = createEmptyBoard();
      b[0][4] = { type: 'k', color: 'black' };
      b[2][6] = { type: 'h', color: 'red' }; // Fishing horse
      b[1][5] = { type: 'r', color: 'red' }; // Move to 0,5
      b[9][4] = { type: 'k', color: 'red' };
      return b;
    })()
  },
  {
    id: 'ba-huang-ma',
    name: '拔簧馬',
    description: '車馬一條線，利用車的棄子或抽將，使馬最終形成殺局。請跳馬完成絕殺！(1步殺)',
    initialBoard: (() => {
      const b = createEmptyBoard();
      b[0][4] = { type: 'k', color: 'black' };
      b[0][5] = { type: 'a', color: 'black' };
      b[2][4] = { type: 'h', color: 'red' }; // Move to 0,3
      b[1][4] = { type: 'r', color: 'red' }; // Rook blocks the king
      b[9][4] = { type: 'k', color: 'red' };
      return b;
    })()
  },
  {
    id: 'zhong-pao-sha',
    name: '重炮殺',
    description: '雙炮重疊，前炮利用後炮作炮架，一舉將死對方。請移動紅炮完成絕殺！(1步殺)',
    initialBoard: (() => {
      const b = createEmptyBoard();
      b[0][4] = { type: 'k', color: 'black' };
      b[0][3] = { type: 'a', color: 'black' };
      b[0][5] = { type: 'a', color: 'black' };
      b[1][4] = { type: 'c', color: 'red' };
      b[1][0] = { type: 'r', color: 'red' }; // Protects front cannon
      b[2][5] = { type: 'c', color: 'red' }; // Move to 2,4
      b[9][4] = { type: 'k', color: 'red' };
      return b;
    })()
  },
  {
    id: 'pao-nian-dan-sha',
    name: '炮碾丹砂',
    description: '車借炮的威力，輾轉掃蕩對方士象，最終成殺。請移動紅車完成絕殺！(1步殺)',
    initialBoard: (() => {
      const b = createEmptyBoard();
      b[0][4] = { type: 'k', color: 'black' };
      b[0][3] = { type: 'a', color: 'black' };
      b[1][4] = { type: 'c', color: 'red' };
      b[0][5] = { type: 'r', color: 'red' }; // Move to 0,4
      b[9][4] = { type: 'k', color: 'red' };
      return b;
    })()
  }
];
