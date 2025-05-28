class ChessGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.gameState = 'playing'; // playing, check, checkmate, stalemate
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.hasKingMoved = { white: false, black: false };
        this.hasRookMoved = {
            white: { kingside: false, queenside: false },
            black: { kingside: false, queenside: false }
        };
        this.enPassantTarget = null;

        this.pieceSymbols = {
            white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
            black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
        };

        this.initializeDOM();
        this.renderBoard();
        this.updateGameInfo();
    }

    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));

        // Set up pawns
        for (let col = 0; col < 8; col++) {
            board[1][col] = { type: 'pawn', color: 'black' };
            board[6][col] = { type: 'pawn', color: 'white' };
        }

        // Set up other pieces
        const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        for (let col = 0; col < 8; col++) {
            board[0][col] = { type: backRank[col], color: 'black' };
            board[7][col] = { type: backRank[col], color: 'white' };
        }

        return board;
    }

    initializeDOM() {
        this.boardElement = document.getElementById('chessBoard');
        this.currentPlayerElement = document.getElementById('currentPlayer');
        this.gameStatusElement = document.getElementById('gameStatus');
        this.moveListElement = document.getElementById('moveList');
        this.whiteCapturedElement = document.getElementById('whiteCaptured');
        this.blackCapturedElement = document.getElementById('blackCaptured');
        this.newGameBtn = document.getElementById('newGameBtn');
        this.undoBtn = document.getElementById('undoBtn');
        this.promotionModal = document.getElementById('promotionModal');

        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.undoBtn.addEventListener('click', () => this.undoMove());

        // Promotion modal event listeners
        document.querySelectorAll('.promotion-piece').forEach(button => {
            button.addEventListener('click', (e) => {
                this.handlePromotion(e.target.dataset.piece);
            });
        });
    }

    renderBoard() {
        this.boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            const rowElement = document.createElement('div');
            rowElement.className = 'board-row';

            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    square.textContent = this.pieceSymbols[piece.color][piece.type];
                }

                square.addEventListener('click', () => this.handleSquareClick(row, col));
                rowElement.appendChild(square);
            }

            this.boardElement.appendChild(rowElement);
        }
    }

    handleSquareClick(row, col) {
        if (this.gameState !== 'playing' && this.gameState !== 'check') return;

        const clickedSquare = { row, col };
        const piece = this.board[row][col];

        if (this.selectedSquare) {
            if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
                // Deselect the same square
                this.clearSelection();
            } else if (this.isValidMove(this.selectedSquare, clickedSquare)) {
                this.makeMove(this.selectedSquare, clickedSquare);
            } else if (piece && piece.color === this.currentPlayer) {
                // Select a different piece of the same color
                this.selectSquare(clickedSquare);
            } else {
                this.clearSelection();
            }
        } else {
            if (piece && piece.color === this.currentPlayer) {
                this.selectSquare(clickedSquare);
            }
        }
    }

    selectSquare(square) {
        this.selectedSquare = square;
        this.highlightSquares();
    }

    clearSelection() {
        this.selectedSquare = null;
        this.clearHighlights();
    }

    highlightSquares() {
        this.clearHighlights();

        if (!this.selectedSquare) return;

        const selectedElement = document.querySelector(`[data-row="${this.selectedSquare.row}"][data-col="${this.selectedSquare.col}"]`);
        selectedElement.classList.add('selected');

        const validMoves = this.getValidMoves(this.selectedSquare);
        validMoves.forEach(move => {
            const element = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            if (this.board[move.row][move.col]) {
                element.classList.add('capture-move');
            } else {
                element.classList.add('valid-move');
            }
        });
    }

    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'capture-move', 'in-check');
        });
    }

    getValidMoves(from) {
        const piece = this.board[from.row][from.col];
        if (!piece) return [];

        let moves = [];

        switch (piece.type) {
            case 'pawn':
                moves = this.getPawnMoves(from, piece.color);
                break;
            case 'rook':
                moves = this.getRookMoves(from);
                break;
            case 'knight':
                moves = this.getKnightMoves(from);
                break;
            case 'bishop':
                moves = this.getBishopMoves(from);
                break;
            case 'queen':
                moves = this.getQueenMoves(from);
                break;
            case 'king':
                moves = this.getKingMoves(from);
                break;
        }

        // Filter out moves that would put own king in check
        return moves.filter(to => !this.wouldBeInCheckAfterMove(from, to));
    }

    getPawnMoves(from, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        const { row, col } = from;

        // Forward move
        if (this.isInBounds(row + direction, col) && !this.board[row + direction][col]) {
            moves.push({ row: row + direction, col });

            // Double move from start position
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push({ row: row + 2 * direction, col });
            }
        }

        // Captures
        [-1, 1].forEach(deltaCol => {
            const newRow = row + direction;
            const newCol = col + deltaCol;

            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (targetPiece && targetPiece.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }

                // En passant
                if (this.enPassantTarget &&
                    this.enPassantTarget.row === newRow &&
                    this.enPassantTarget.col === newCol) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });

        return moves;
    }

    getRookMoves(from) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        directions.forEach(([deltaRow, deltaCol]) => {
            moves.push(...this.getMovesInDirection(from, deltaRow, deltaCol));
        });

        return moves;
    }

    getBishopMoves(from) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        directions.forEach(([deltaRow, deltaCol]) => {
            moves.push(...this.getMovesInDirection(from, deltaRow, deltaCol));
        });

        return moves;
    }

    getQueenMoves(from) {
        return [...this.getRookMoves(from), ...this.getBishopMoves(from)];
    }

    getKnightMoves(from) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        knightMoves.forEach(([deltaRow, deltaCol]) => {
            const newRow = from.row + deltaRow;
            const newCol = from.col + deltaCol;

            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece || targetPiece.color !== this.board[from.row][from.col].color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });

        return moves;
    }

    getKingMoves(from) {
        const moves = [];
        const kingMoves = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        kingMoves.forEach(([deltaRow, deltaCol]) => {
            const newRow = from.row + deltaRow;
            const newCol = from.col + deltaCol;

            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece || targetPiece.color !== this.board[from.row][from.col].color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });

        // Castling
        const color = this.board[from.row][from.col].color;
        if (!this.hasKingMoved[color] && !this.isInCheck(color)) {
            // Kingside castling
            if (!this.hasRookMoved[color].kingside &&
                !this.board[from.row][5] && !this.board[from.row][6] &&
                !this.isSquareAttacked(from.row, 5, color) &&
                !this.isSquareAttacked(from.row, 6, color)) {
                moves.push({ row: from.row, col: 6 });
            }

            // Queenside castling
            if (!this.hasRookMoved[color].queenside &&
                !this.board[from.row][1] && !this.board[from.row][2] && !this.board[from.row][3] &&
                !this.isSquareAttacked(from.row, 2, color) &&
                !this.isSquareAttacked(from.row, 3, color)) {
                moves.push({ row: from.row, col: 2 });
            }
        }

        return moves;
    }

    getMovesInDirection(from, deltaRow, deltaCol) {
        const moves = [];
        const piece = this.board[from.row][from.col];
        let row = from.row + deltaRow;
        let col = from.col + deltaCol;

        while (this.isInBounds(row, col)) {
            const targetPiece = this.board[row][col];

            if (!targetPiece) {
                moves.push({ row, col });
            } else {
                if (targetPiece.color !== piece.color) {
                    moves.push({ row, col });
                }
                break;
            }

            row += deltaRow;
            col += deltaCol;
        }

        return moves;
    }

    isValidMove(from, to) {
        const validMoves = this.getValidMoves(from);
        return validMoves.some(move => move.row === to.row && move.col === to.col);
    }

    makeMove(from, to) {
        const piece = this.board[from.row][from.col];
        const capturedPiece = this.board[to.row][to.col];
        const moveData = {
            from: { ...from },
            to: { ...to },
            piece: { ...piece },
            capturedPiece: capturedPiece ? { ...capturedPiece } : null,
            enPassantTarget: this.enPassantTarget,
            castlingRights: {
                hasKingMoved: { ...this.hasKingMoved },
                hasRookMoved: {
                    white: { ...this.hasRookMoved.white },
                    black: { ...this.hasRookMoved.black }
                }
            }
        };

        // Handle en passant capture
        if (piece.type === 'pawn' && this.enPassantTarget &&
            to.row === this.enPassantTarget.row && to.col === this.enPassantTarget.col) {
            const capturedPawnRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
            moveData.enPassantCapture = { ...this.board[capturedPawnRow][to.col] };
            this.capturedPieces[piece.color === 'white' ? 'black' : 'white'].push(this.board[capturedPawnRow][to.col]);
            this.board[capturedPawnRow][to.col] = null;
        }

        // Handle regular capture
        if (capturedPiece) {
            this.capturedPieces[piece.color === 'white' ? 'black' : 'white'].push(capturedPiece);
        }

        // Move the piece
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;

        // Handle castling
        if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
            const isKingside = to.col > from.col;
            const rookFromCol = isKingside ? 7 : 0;
            const rookToCol = isKingside ? 5 : 3;

            this.board[to.row][rookToCol] = this.board[to.row][rookFromCol];
            this.board[to.row][rookFromCol] = null;

            moveData.castling = { isKingside, rookFrom: rookFromCol, rookTo: rookToCol };
        }

        // Update castling rights
        if (piece.type === 'king') {
            this.hasKingMoved[piece.color] = true;
        } else if (piece.type === 'rook') {
            if (from.col === 0) this.hasRookMoved[piece.color].queenside = true;
            if (from.col === 7) this.hasRookMoved[piece.color].kingside = true;
        }

        // Set en passant target
        this.enPassantTarget = null;
        if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
            this.enPassantTarget = {
                row: (from.row + to.row) / 2,
                col: to.col
            };
        }

        // Handle pawn promotion
        if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
            this.pendingPromotion = { row: to.row, col: to.col, color: piece.color };
            this.showPromotionModal();
            moveData.promotion = true;
        }

        this.moveHistory.push(moveData);
        this.switchPlayer();
        this.clearSelection();
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.undoBtn.disabled = false;

        // Check for game end conditions
        this.checkGameEnd();
    }

    showPromotionModal() {
        this.promotionModal.style.display = 'flex';
    }

    handlePromotion(pieceType) {
        if (this.pendingPromotion) {
            const { row, col, color } = this.pendingPromotion;
            this.board[row][col] = { type: pieceType, color };

            // Update the last move data
            const lastMove = this.moveHistory[this.moveHistory.length - 1];
            lastMove.promotedTo = pieceType;

            this.pendingPromotion = null;
            this.promotionModal.style.display = 'none';
            this.renderBoard();
            this.updateMoveHistory();
        }
    }

    undoMove() {
        if (this.moveHistory.length === 0) return;

        const moveData = this.moveHistory.pop();
        const { from, to, piece, capturedPiece, enPassantCapture, castling } = moveData;

        // Restore the piece to its original position
        this.board[from.row][from.col] = piece;
        this.board[to.row][to.col] = capturedPiece;

        // Handle en passant undo
        if (enPassantCapture) {
            const capturedPawnRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
            this.board[capturedPawnRow][to.col] = enPassantCapture;
            this.capturedPieces[piece.color === 'white' ? 'black' : 'white'].pop();
        }

        // Handle regular capture undo
        if (capturedPiece) {
            this.capturedPieces[piece.color === 'white' ? 'black' : 'white'].pop();
        }

        // Handle castling undo
        if (castling) {
            const { rookFrom, rookTo } = castling;
            this.board[to.row][rookFrom] = this.board[to.row][rookTo];
            this.board[to.row][rookTo] = null;
        }

        // Restore game state
        this.enPassantTarget = moveData.enPassantTarget;
        this.hasKingMoved = moveData.castlingRights.hasKingMoved;
        this.hasRookMoved = moveData.castlingRights.hasRookMoved;

        this.switchPlayer();
        this.gameState = 'playing';
        this.clearSelection();
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateCapturedPieces();

        if (this.moveHistory.length === 0) {
            this.undoBtn.disabled = true;
        }
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
    }

    wouldBeInCheckAfterMove(from, to) {
        // Make a temporary move
        const originalPiece = this.board[to.row][to.col];
        const movingPiece = this.board[from.row][from.col];

        this.board[to.row][to.col] = movingPiece;
        this.board[from.row][from.col] = null;

        const inCheck = this.isInCheck(movingPiece.color);

        // Restore the board
        this.board[from.row][from.col] = movingPiece;
        this.board[to.row][to.col] = originalPiece;

        return inCheck;
    }

    isInCheck(color) {
        const kingPosition = this.findKing(color);
        if (!kingPosition) return false;

        return this.isSquareAttacked(kingPosition.row, kingPosition.col, color);
    }

    isSquareAttacked(row, col, defendingColor) {
        const attackingColor = defendingColor === 'white' ? 'black' : 'white';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === attackingColor) {
                    const moves = this.getPieceAttackingMoves({ row: r, col: c }, piece);
                    if (moves.some(move => move.row === row && move.col === col)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    getPieceAttackingMoves(from, piece) {
        // Similar to getValidMoves but doesn't check for king safety
        switch (piece.type) {
            case 'pawn':
                return this.getPawnAttackingMoves(from, piece.color);
            case 'rook':
                return this.getRookMoves(from);
            case 'knight':
                return this.getKnightMoves(from);
            case 'bishop':
                return this.getBishopMoves(from);
            case 'queen':
                return this.getQueenMoves(from);
            case 'king':
                return this.getKingAttackingMoves(from);
            default:
                return [];
        }
    }

    getPawnAttackingMoves(from, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const { row, col } = from;

        // Pawn attacks diagonally
        [-1, 1].forEach(deltaCol => {
            const newRow = row + direction;
            const newCol = col + deltaCol;

            if (this.isInBounds(newRow, newCol)) {
                moves.push({ row: newRow, col: newCol });
            }
        });

        return moves;
    }

    getKingAttackingMoves(from) {
        const moves = [];
        const kingMoves = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        kingMoves.forEach(([deltaRow, deltaCol]) => {
            const newRow = from.row + deltaRow;
            const newCol = from.col + deltaCol;

            if (this.isInBounds(newRow, newCol)) {
                moves.push({ row: newRow, col: newCol });
            }
        });

        return moves;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    checkGameEnd() {
        const inCheck = this.isInCheck(this.currentPlayer);
        const hasValidMoves = this.hasValidMoves(this.currentPlayer);

        if (inCheck) {
            this.gameState = 'check';
            const kingPosition = this.findKing(this.currentPlayer);
            if (kingPosition) {
                const kingElement = document.querySelector(`[data-row="${kingPosition.row}"][data-col="${kingPosition.col}"]`);
                kingElement.classList.add('in-check');
            }

            if (!hasValidMoves) {
                this.gameState = 'checkmate';
            }
        } else if (!hasValidMoves) {
            this.gameState = 'stalemate';
        } else {
            this.gameState = 'playing';
        }
    }

    hasValidMoves(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const validMoves = this.getValidMoves({ row, col });
                    if (validMoves.length > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    updateGameInfo() {
        const playerText = this.currentPlayer === 'white' ? 'Bianco' : 'Nero';
        this.currentPlayerElement.textContent = `Turno: ${playerText}`;

        let statusText = 'Partita in corso';
        if (this.gameState === 'check') {
            statusText = `${playerText} sotto scacco!`;
        } else if (this.gameState === 'checkmate') {
            const winner = this.currentPlayer === 'white' ? 'Nero' : 'Bianco';
            statusText = `Scacco matto! Vince ${winner}`;
        } else if (this.gameState === 'stalemate') {
            statusText = 'Stallo - Partita patta';
        }

        this.gameStatusElement.textContent = statusText;
    }

    updateMoveHistory() {
        this.moveListElement.innerHTML = '';
        this.moveHistory.forEach((move, index) => {
            const moveElement = document.createElement('div');
            moveElement.className = 'move-item';

            const moveNumber = Math.floor(index / 2) + 1;
            const isWhiteMove = index % 2 === 0;
            const moveNotation = this.getMoveNotation(move);

            if (isWhiteMove) {
                moveElement.textContent = `${moveNumber}. ${moveNotation}`;
            } else {
                moveElement.textContent = `${moveNumber}... ${moveNotation}`;
            }

            this.moveListElement.appendChild(moveElement);
        });

        this.moveListElement.scrollTop = this.moveListElement.scrollHeight;
    }

    getMoveNotation(move) {
        const { piece, to, capturedPiece, castling, promotion, promotedTo } = move;

        if (castling) {
            return castling.isKingside ? 'O-O' : 'O-O-O';
        }

        let notation = '';

        if (piece.type !== 'pawn') {
            notation += this.pieceSymbols[piece.color][piece.type];
        }

        if (capturedPiece) {
            if (piece.type === 'pawn') {
                notation += String.fromCharCode(97 + move.from.col);
            }
            notation += 'x';
        }

        notation += String.fromCharCode(97 + to.col) + (8 - to.row);

        if (promotion && promotedTo) {
            notation += '=' + this.pieceSymbols[piece.color][promotedTo];
        }

        return notation;
    }

    updateCapturedPieces() {
        this.whiteCapturedElement.innerHTML = '';
        this.blackCapturedElement.innerHTML = '';

        this.capturedPieces.white.forEach(piece => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = this.pieceSymbols[piece.color][piece.type];
            this.whiteCapturedElement.appendChild(pieceElement);
        });

        this.capturedPieces.black.forEach(piece => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = this.pieceSymbols[piece.color][piece.type];
            this.blackCapturedElement.appendChild(pieceElement);
        });
    }

    newGame() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.gameState = 'playing';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.hasKingMoved = { white: false, black: false };
        this.hasRookMoved = {
            white: { kingside: false, queenside: false },
            black: { kingside: false, queenside: false }
        };
        this.enPassantTarget = null;
        this.pendingPromotion = null;

        this.promotionModal.style.display = 'none';
        this.undoBtn.disabled = true;
        this.clearSelection();
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateCapturedPieces();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chessGame = new ChessGame();
});
