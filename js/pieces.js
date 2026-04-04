'use strict';

Tetris.Pieces = (function() {
  const C = Tetris.Constants;

  // Each piece has 4 rotation states (0, 1, 2, 3 = spawn, CW, 180, CCW)
  // Stored as 4x4 grids. The number represents the piece type (1-7) or 0 for empty.
  const SHAPES = {
    // I-piece (type 1)
    1: [
      [[0,0,0,0],
       [1,1,1,1],
       [0,0,0,0],
       [0,0,0,0]],
      [[0,0,1,0],
       [0,0,1,0],
       [0,0,1,0],
       [0,0,1,0]],
      [[0,0,0,0],
       [0,0,0,0],
       [1,1,1,1],
       [0,0,0,0]],
      [[0,1,0,0],
       [0,1,0,0],
       [0,1,0,0],
       [0,1,0,0]]
    ],
    // O-piece (type 2)
    2: [
      [[0,2,2,0],
       [0,2,2,0],
       [0,0,0,0],
       [0,0,0,0]],
      [[0,2,2,0],
       [0,2,2,0],
       [0,0,0,0],
       [0,0,0,0]],
      [[0,2,2,0],
       [0,2,2,0],
       [0,0,0,0],
       [0,0,0,0]],
      [[0,2,2,0],
       [0,2,2,0],
       [0,0,0,0],
       [0,0,0,0]]
    ],
    // T-piece (type 3)
    3: [
      [[0,3,0,0],
       [3,3,3,0],
       [0,0,0,0],
       [0,0,0,0]],
      [[0,3,0,0],
       [0,3,3,0],
       [0,3,0,0],
       [0,0,0,0]],
      [[0,0,0,0],
       [3,3,3,0],
       [0,3,0,0],
       [0,0,0,0]],
      [[0,3,0,0],
       [3,3,0,0],
       [0,3,0,0],
       [0,0,0,0]]
    ],
    // S-piece (type 4)
    4: [
      [[0,4,4,0],
       [4,4,0,0],
       [0,0,0,0],
       [0,0,0,0]],
      [[0,4,0,0],
       [0,4,4,0],
       [0,0,4,0],
       [0,0,0,0]],
      [[0,0,0,0],
       [0,4,4,0],
       [4,4,0,0],
       [0,0,0,0]],
      [[4,0,0,0],
       [4,4,0,0],
       [0,4,0,0],
       [0,0,0,0]]
    ],
    // Z-piece (type 5)
    5: [
      [[5,5,0,0],
       [0,5,5,0],
       [0,0,0,0],
       [0,0,0,0]],
      [[0,0,5,0],
       [0,5,5,0],
       [0,5,0,0],
       [0,0,0,0]],
      [[0,0,0,0],
       [5,5,0,0],
       [0,5,5,0],
       [0,0,0,0]],
      [[0,5,0,0],
       [5,5,0,0],
       [5,0,0,0],
       [0,0,0,0]]
    ],
    // J-piece (type 6)
    6: [
      [[6,0,0,0],
       [6,6,6,0],
       [0,0,0,0],
       [0,0,0,0]],
      [[0,6,6,0],
       [0,6,0,0],
       [0,6,0,0],
       [0,0,0,0]],
      [[0,0,0,0],
       [6,6,6,0],
       [0,0,6,0],
       [0,0,0,0]],
      [[0,6,0,0],
       [0,6,0,0],
       [6,6,0,0],
       [0,0,0,0]]
    ],
    // L-piece (type 7)
    7: [
      [[0,0,7,0],
       [7,7,7,0],
       [0,0,0,0],
       [0,0,0,0]],
      [[0,7,0,0],
       [0,7,0,0],
       [0,7,7,0],
       [0,0,0,0]],
      [[0,0,0,0],
       [7,7,7,0],
       [7,0,0,0],
       [0,0,0,0]],
      [[7,7,0,0],
       [0,7,0,0],
       [0,7,0,0],
       [0,0,0,0]]
    ]
  };

  // Wall kick offsets: [dx, dy] to try when rotation causes collision
  // Non-I pieces
  const WALL_KICKS_NORMAL = [
    [0, 0], [-1, 0], [1, 0], [0, -1]
  ];

  // I-piece has wider kicks
  const WALL_KICKS_I = [
    [0, 0], [-2, 0], [2, 0], [-1, 0], [1, 0]
  ];

  /**
   * Create a new piece of the given type (1-7)
   * @param {number} typeIndex - Piece type (1-7)
   * @returns {object} Piece object
   */
  function createPiece(typeIndex) {
    return {
      type: typeIndex,
      rotation: 0,
      x: 3, // centered horizontally on 10-wide board
      y: 0, // top of hidden buffer
      shape: SHAPES[typeIndex][0]
    };
  }

  /**
   * Get the shape for a piece after rotation
   * @param {object} piece - Current piece
   * @param {number} direction - +1 for CW, -1 for CCW
   * @returns {Array} The rotated shape grid
   */
  function getRotatedShape(piece, direction) {
    const newRotation = ((piece.rotation + direction) % 4 + 4) % 4;
    return SHAPES[piece.type][newRotation];
  }

  /**
   * Get the new rotation index after rotating
   * @param {object} piece - Current piece
   * @param {number} direction - +1 for CW, -1 for CCW
   * @returns {number} New rotation index
   */
  function getNewRotation(piece, direction) {
    return ((piece.rotation + direction) % 4 + 4) % 4;
  }

  /**
   * Get wall kick offsets for this piece type
   * @param {object} piece - Current piece
   * @returns {Array} Array of [dx, dy] offsets to try
   */
  function getKickOffsets(piece) {
    if (piece.type === 1) {
      return WALL_KICKS_I;
    }
    return WALL_KICKS_NORMAL;
  }

  return {
    SHAPES,
    createPiece,
    getRotatedShape,
    getNewRotation,
    getKickOffsets
  };
})();
