"use strict";

{
  const COLS = 6;
  const ROWS = 12;
  const COLORS = 5;
  const ERASE_COUNT = 3; // 何個つながったら消えるか
  const NEXT_COUNT = 3; // NEXTは3つ
  const BALL_RATE = 0.6; // おおだまの出現率（0～1）
  let nextPairs = []; // NEXT用配列
  let isGameOver = false;
  let score = 0;
  let chainCount = 0;

  // 盤面
  let field = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  const board = document.getElementById("board");

  // ペア玉
  let pair = null;

  // ペア生成
  let fallDelay = 30; // 落ちる速度（数字が小さいほど速い）
  let fallCounter = 0;

  // おおだま・こだまをランダム生成
  function randomBall() {
    const color = Math.ceil(Math.random() * COLORS);

    const r = Math.random();

    if (r < BALL_RATE) {
      return color; // おおだま
    } else {
      return color + 10; // こだま
    }
  }

  function initNext() {
    nextPairs = [];

    for (let i = 0; i < NEXT_COUNT; i++) {
      nextPairs.push([randomBall(), randomBall()]);
    }
  }

  function canPlacePair() {
    const x = Math.floor(COLS / 2) - 1;
    const y = 1;
    const rot = 0; // 初期縦向き

    const [p, q] = getPairPosWith(x, y, rot);

    // どちらか一方でも置ければOK
    return checkCell(p[0], p[1]) || checkCell(q[0], q[1]);
  }

  function gameOver() {
    isGameOver = true;
    pair = null;
    document.getElementById("overlay").classList.remove("hidden");
  }

  /**
   * NEXTの先頭を現在のペアにする　＋　NEXT補充
   */
  function newPair() {
    if (!canPlacePair()) {
      gameOver();
      return;
    }

    // NEXTの先頭を取り出してペアにする
    const blocks = nextPairs.shift();

    pair = {
      x: Math.floor(COLS / 2) - 1,
      y: 1,
      blocks: blocks,
      rot: 0,
    };

    // 新しいNEXTを末尾に追加
    nextPairs.push([randomBall(), randomBall()]);

    chainCount = 0;
  }

  // ペアの2つの玉の位置を返す
  function getPairPos() {
    let ax, ay, bx, by;
    // 下の玉（中心）
    bx = pair.x;
    by = pair.y;

    if (pair.rot === 0) {
      ax = pair.x;
      ay = pair.y - 1;
    }
    if (pair.rot === 1) {
      ax = pair.x + 1;
      ay = pair.y;
    }
    if (pair.rot === 2) {
      ax = pair.x;
      ay = pair.y + 1;
    }
    if (pair.rot === 3) {
      ax = pair.x - 1;
      ay = pair.y;
    }

    return [
      [ax, ay],
      [bx, by],
    ];
  }

  // 移動可能か
  /**
   * 当たり判定
   * @param {*} dx ｘ座標
   * @param {*} dy ｙ座標
   * @param {*} dr 向き
   * @returns 移動可能かどうか
   */
  function canMove(dx, dy, dr = 0) {
    let rot = (pair.rot + dr + 4) % 4;
    let [p, q] = getPairPosWith(pair.x + dx, pair.y + dy, rot);
    return checkCell(p[0], p[1]) && checkCell(q[0], q[1]);
  }
  /**
   * 回転する
   * @param {*} pair 現在の色の組み合わせ
   * @param {*} dr 回転方向
   * @returns
   */
  function tryRotate(pair, dr) {
    const newRot = (pair.rot + dr + 4) % 4;

    // ① その場で回転
    if (canMove(0, 0, dr)) {
      pair.rot = newRot;
      return;
    }

    // ② 右キック
    if (canMove(1, 0, dr)) {
      pair.x++;
      pair.rot = newRot;
      return;
    }

    // ③ 左キック
    if (canMove(-1, 0, dr)) {
      pair.x--;
      pair.rot = newRot;
      return;
    }

    // ④ 上キック
    if (canMove(0, -1, dr)) {
      pair.y--;
      pair.rot = newRot;
      return;
    }

    // 回転できなかった ＋ 縦向きなら上下入れ替え
    if (pair.rot % 2 === 0) {
      let tmp = pair.blocks[0];
      pair.blocks[0] = pair.blocks[1];
      pair.blocks[1] = tmp;
    }
  }

  /**
   * ペアの座標を計算する
   * @param {*} x 基準のｘ座標
   * @param {*} y 基準のｙ座標
   * @param {*} rot 回転方向
   * @returns 二つそれぞれの座標
   */
  function getPairPosWith(x, y, rot) {
    let ax, ay, bx, by;
    bx = x;
    by = y;
    if (rot === 0) {
      ax = x;
      ay = y - 1;
    }
    if (rot === 1) {
      ax = x + 1;
      ay = y;
    }
    if (rot === 2) {
      ax = x;
      ay = y + 1;
    }
    if (rot === 3) {
      ax = x - 1;
      ay = y;
    }
    return [
      [ax, ay],
      [bx, by],
    ];
  }

  /**
   * ゴーストの位置を計算する
   * 現在のペアを仮想的に一番下まで落とす
   * @returns
   */
  function getGhostPos() {
    if (!pair) return null;

    const [a, b] = getPairPos();

    // a に blocks[0]、b に blocks[1] が対応している
    const blockA = pair.blocks[0];
    const blockB = pair.blocks[1];

    // 縦向き（同じ列）
    if (a[0] === b[0]) {
      const x = a[0];

      const isAAbove = a[1] < b[1];

      const top = isAAbove ? a : b;
      const bottom = isAAbove ? b : a;

      const topColor = isAAbove ? blockA : blockB;
      const bottomColor = isAAbove ? blockB : blockA;

      let offset = 0;

      while (checkCell(x, bottom[1] + offset + 1)) {
        offset++;
      }

      return [
        { x: top[0], y: top[1] + offset, col: topColor },
        { x: bottom[0], y: bottom[1] + offset, col: bottomColor },
      ];
    }

    // 横向き（ちぎれ）
    const ghostA = getSingleGhost(a[0], a[1]);
    const ghostB = getSingleGhost(b[0], b[1]);

    return [
      { x: ghostA[0], y: ghostA[1], col: blockA },
      { x: ghostB[0], y: ghostB[1], col: blockB },
    ];
  }

  /**
   * 1マス単体でどこまで落ちるか
   */
  function getSingleGhost(x, y) {
    let ny = y;

    while (true) {
      if (!checkCell(x, ny + 1)) break;
      ny++;
    }

    return [x, ny];
  }

  /**
   * 余白があるかどうか
   * @param {*} x 余白か知りたいマスのｘ座標
   * @param {*} y 余白か知りたいマスのｙ座標
   * @returns 設置可能か
   */
  function checkCell(x, y) {
    if (x < 0 || x >= COLS) return false;
    if (y >= ROWS) return false;
    if (y >= 0 && field[y][x] !== 0) return false;
    return true;
  }

  // 描画
  function render() {
    board.innerHTML = "";

    // 盤面
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const div = document.createElement("div");
        div.className = "cell c" + field[y][x];
        board.appendChild(div);
      }
    }

    // ゴースト描画
    if (pair) {
      const ghost = getGhostPos();
      if (ghost) {
        ghost.forEach((g) => {
          drawGhostBlock(g.x, g.y, g.col);
        });
      }
    }

    // ペア玉
    if (pair) {
      let [a, b] = getPairPos();
      drawBlock(a[0], a[1], pair.blocks[0]);
      drawBlock(b[0], b[1], pair.blocks[1]);
    }

    renderNext();
  }

  /**
   * NEXTを描画する
   */
  function renderNext() {
    const nextDiv = document.getElementById("next");
    nextDiv.innerHTML = "";

    for (let i = 0; i < NEXT_COUNT; i++) {
      const [top, bottom] = nextPairs[i];

      const pairDiv = document.createElement("div");
      pairDiv.className = "pair"; // クラスを付けてCSS制御

      const topDiv = document.createElement("div");
      topDiv.className = "cell c" + top;

      const bottomDiv = document.createElement("div");
      bottomDiv.className = "cell c" + bottom;

      pairDiv.appendChild(topDiv);
      pairDiv.appendChild(bottomDiv);

      nextDiv.appendChild(pairDiv);
    }
  }

  /**
   * 描画する
   * @param {*} x 描画したいマスのｘ座標
   * @param {*} y 描画したいマスのｙ座標
   * @param {*} col 色
   * @returns
   */
  function drawBlock(x, y, col) {
    if (y < 0) return;
    const index = y * COLS + x;
    const cell = board.children[index];
    if (!cell) return;

    const color = col > COLORS ? col - 10 : col;
    cell.className = "cell c" + color;

    if (col > COLORS) {
      cell.classList.add("small"); // こだま用
    }
  }

  /**
   * ゴースト描画
   * @param {*} x 描画したいマスのｘ座標
   * @param {*} y 描画したいマスのｙ座標
   * @param {*} col 色
   * @returns
   */
  function drawGhostBlock(x, y, col) {
    if (y < 0) return;
    const index = y * COLS + x;
    const cell = board.children[index];
    if (cell && field[y][x] === 0) {
      cell.className = "cell c" + col + " ghost";
    }
  }

  // 固定
  function fixPair() {
    let [a, b] = getPairPos();
    if (a[1] >= 0) field[a[1]][a[0]] = pair.blocks[0];
    if (b[1] >= 0) field[b[1]][b[0]] = pair.blocks[1];
  }

  function isBig(v) {
    return v >= 1 && v <= COLORS;
  }

  function isSmall(v) {
    return v > COLORS;
  }

  function getColor(v) {
    return v > COLORS ? v - 10 : v;
  }

  // 消えるおおだまの隣のこだまを変化させる
  function transformKodama(group) {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    for (let [gx, gy] of group) {
      for (let [dx, dy] of dirs) {
        const nx = gx + dx;
        const ny = gy + dy;

        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;

        if (isSmall(field[ny][nx])) {
          field[ny][nx] -= 10; // 小玉 → 大玉
        }
      }
    }
  }

  // 消去判定（DFS）
  function checkErase() {
    let visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

    let totalCount = 0;
    let groupSizes = [];
    let erasedColors = new Set();

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        // ★ おおだまだけ探索対象にする
        if (isBig(field[y][x]) && !visited[y][x]) {
          let col = field[y][x];
          let group = [];
          dfs(x, y, col, visited, group);

          if (group.length >= ERASE_COUNT) {
            // ★ 先にこだまを変化させる
            transformKodama(group);

            groupSizes.push(group.length);
            erasedColors.add(col);
            totalCount += group.length;

            // おおだまを消す
            for (let [gx, gy] of group) {
              field[gy][gx] = 0;
            }
          }
        }
      }
    }

    if (totalCount === 0) return null;

    return {
      totalCount,
      groupSizes,
      colorCount: erasedColors.size,
    };
  }

  const CHAIN_BONUS = [
    0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416,
    448, 480, 512,
  ];

  function getConnectionBonus(count) {
    if (count <= 3) return 0;
    if (count === 4) return 2;
    if (count === 5) return 3;
    if (count === 6) return 4;
    if (count === 7) return 5;
    if (count === 8) return 6;
    if (count === 9) return 7;
    return 10;
  }

  function getColorBonus(colorCount) {
    if (colorCount <= 1) return 0;
    if (colorCount === 2) return 3;
    if (colorCount === 3) return 6;
    if (colorCount === 4) return 12;
    return 0;
  }

  /**
   * スコア計算
   * @param {*} eraseInfo 削除結果のデータ。何色が何個消えたか、何連鎖かなど
   */
  function addScore(eraseInfo) {
    chainCount++;

    const chainBonus =
      chainCount < CHAIN_BONUS.length ? CHAIN_BONUS[chainCount] : 512;

    let connectionBonus = 0;
    eraseInfo.groupSizes.forEach((size) => {
      connectionBonus += getConnectionBonus(size);
    });

    const colorBonus = getColorBonus(eraseInfo.colorCount);

    const rawBonus = chainBonus + connectionBonus + colorBonus;
    const multiplier = Math.max(1, rawBonus);

    const gained = eraseInfo.totalCount * multiplier * 10;

    score += gained;

    console.log("連鎖:", chainCount);
    console.log("今回:", gained);
    console.log("合計:", score);

    document.getElementById("score").textContent = score;
  }

  /**
   *消せるかどうか調べる
   * @param {*} x 探索を始めるマスのｘ座標
   * @param {*} y 探索を始めるマスのｘ座標
   * @param {*} col 探索を始めるマスの色
   * @param {*} v visited　調べ済みかどうかを記録する配列
   * @param {*} group 同じ色のマスの座標を入れる関数
   * @returns
   */
  function dfs(x, y, col, v, group) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
    if (v[y][x]) return;
    if (field[y][x] !== col) return;

    v[y][x] = true;
    group.push([x, y]);

    dfs(x + 1, y, col, v, group);
    dfs(x - 1, y, col, v, group);
    dfs(x, y + 1, col, v, group);
    dfs(x, y - 1, col, v, group);
  }

  // 重力
  function gravity() {
    for (let x = 0; x < COLS; x++) {
      for (let y = ROWS - 1; y >= 0; y--) {
        if (field[y][x] === 0) {
          let k = y - 1;
          while (k >= 0 && field[k][x] === 0) k--;
          if (k >= 0) {
            field[y][x] = field[k][x];
            field[k][x] = 0;
          }
        }
      }
    }
  }

  /**
   * ハードドロップ
   */
  function hardDrop() {
    if (!pair) return;

    // 落ちられるだけ落とす
    while (canMove(0, 1)) {
      pair.y++;
    }

    // 固定して重力・消去処理
    fixPair();
    gravity(); // 空中玉の落下処理
    render();

    pair = null;

    // 消去・連鎖処理
    chainCount = 0;

    function chain() {
      const eraseInfo = checkErase();

      if (eraseInfo) {
        addScore(eraseInfo);
        gravity();
        render();
        setTimeout(chain, 200);
      }
    }
    chain();
  }

  /**
   * 盤面のリセット
   */
  function resetGame() {
    field = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    pair = null;
    isGameOver = false;

    initNext();
    newPair();
    update();

    document.getElementById("overlay").classList.add("hidden");

    score = 0;
    document.getElementById("score").textContent = score;
  }

  // ゲームループ
  function update() {
    if (isGameOver) return;
    if (!pair) newPair();

    // 落下
    // 落下タイミング管理
    fallCounter++;
    if (fallCounter >= fallDelay) {
      fallCounter = 0;

      if (canMove(0, 1)) {
        pair.y++;
      } else {
        fixPair();
        gravity();
        render();

        pair = null;

        chainCount = 0;

        function chain() {
          const eraseInfo = checkErase();

          if (eraseInfo) {
            addScore(eraseInfo);
            gravity();
            render();
            setTimeout(chain, 200);
          }
        }
        chain();
      }
    }

    render();
    requestAnimationFrame(update);
  }

  document.addEventListener("keydown", (e) => {
    if (isGameOver && e.key.toLowerCase() === "r") {
      resetGame();
      return;
    }

    if (!pair) return;

    if (e.key === "ArrowLeft" && canMove(-1, 0)) pair.x--;
    if (e.key === "ArrowRight" && canMove(1, 0)) pair.x++;
    if (e.key === "ArrowDown" && canMove(0, 1)) pair.y++;

    if (e.key === "z") tryRotate(pair, -1);
    if (e.key === "x") tryRotate(pair, 1);

    if (e.key === "ArrowUp") hardDrop();

    render();
  });

  initNext();
  newPair();
  update();
}
