class ChessGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.playerColor = 'white'; // 'white' or 'black', for PVC mode
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

        this.pieceSymbols = {
            white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
            black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
        };

        this.gameMode = 'pvp'; // 'pvp' or 'pvc'
        this.aiDifficulty = 10; // Stockfish depth
        this.stockfish = new Worker('stockfish.js');
        this.isAITurn = false;
        this.analysisPanelVisible = false;
        this.currentAnalysis = "";

        this.initializeDOM();
        this.renderBoard();
        this.updateGameInfo();
        this.setupStockfish();
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
        this.resignBtn = document.getElementById('resignBtn');
        this.offerDrawBtn = document.getElementById('offerDrawBtn');
        this.toggleAnalysisBtn = document.getElementById('toggleAnalysisBtn');
        this.analysisPanel = document.getElementById('analysisPanel');
        this.analysisOutput = document.getElementById('analysisOutput');
        this.closeAnalysisBtn = document.getElementById('closeAnalysisBtn'); // Added
        this.promotionModal = document.getElementById('promotionModal');
        this.gameModeSelect = document.getElementById('gameMode');
        this.aiDifficultySelect = document.getElementById('aiDifficulty');
        this.aiDifficultySetting = document.getElementById('aiDifficultySetting');

        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.undoBtn.addEventListener('click', () => this.undoMove());
        this.resignBtn.addEventListener('click', () => this.resignGame());
        this.offerDrawBtn.addEventListener('click', () => this.offerDraw());
        this.toggleAnalysisBtn.addEventListener('click', () => this.toggleAnalysisPanel());
        if (this.closeAnalysisBtn) { // Add event listener for the new close button
            this.closeAnalysisBtn.addEventListener('click', () => this.toggleAnalysisPanel(false));
        }
        this.gameModeSelect.addEventListener('change', (e) => this.setGameMode(e.target.value));
        this.aiDifficultySelect.addEventListener('change', (e) => this.setAIDifficulty(parseInt(e.target.value)));

        // Promotion modal event listeners
        document.querySelectorAll('.promotion-piece').forEach(button => {
            button.addEventListener('click', () => this.handlePromotion(button.dataset.piece));
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
        if (this.isAITurn && this.gameMode === 'pvc') return; // Prevent player moves during AI turn
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

        // Store state for undo
        const previousState = {
            board: JSON.parse(JSON.stringify(this.board)),
            currentPlayer: this.currentPlayer,
            playerColor: this.playerColor, // Store player color for undo in PVC
            gameState: this.gameState,
            capturedPieces: JSON.parse(JSON.stringify(this.capturedPieces)),
            hasKingMoved: JSON.parse(JSON.stringify(this.hasKingMoved)),
            hasRookMoved: JSON.parse(JSON.stringify(this.hasRookMoved)),
            enPassantTarget: this.enPassantTarget,
            moveHistoryLength: this.moveHistory.length // To truncate move history display
        };
        this.moveHistory.push({ from, to, piece, capturedPiece, previousState });

        // Actual move logic
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;

        // Handle castling - move the rook
        if (piece.type === 'king') {
            this.hasKingMoved[piece.color] = true;
            // Kingside castling
            if (to.col - from.col === 2) {
                this.board[from.row][5] = this.board[from.row][7];
                this.board[from.row][7] = null;
                this.hasRookMoved[piece.color].kingside = true;
            }
            // Queenside castling
            if (to.col - from.col === -2) {
                this.board[from.row][3] = this.board[from.row][0];
                this.board[from.row][0] = null;
                this.hasRookMoved[piece.color].queenside = true;
            }
        }

        // Update rook moved status
        if (piece.type === 'rook') {
            if (from.col === 0 && from.row === (piece.color === 'white' ? 7 : 0)) {
                this.hasRookMoved[piece.color].queenside = true;
            }
            if (from.col === 7 && from.row === (piece.color === 'white' ? 7 : 0)) {
                this.hasRookMoved[piece.color].kingside = true;
            }
        }

        // Handle pawn promotion
        if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
            this.showPromotionModal(to, piece.color);
            // The actual promotion is handled by handlePromotion
            // For now, we pause the game flow here until promotion is chosen
            return; // Important: exit makeMove until promotion is handled
        }

        // Handle en passant capture
        if (piece.type === 'pawn' && this.enPassantTarget && to.row === this.enPassantTarget.row && to.col === this.enPassantTarget.col) {
            const capturedPawnRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
            const enPassantCapturedPiece = this.board[capturedPawnRow][to.col];
            if (enPassantCapturedPiece) {
                this.capturedPieces[this.currentPlayer].push(enPassantCapturedPiece);
                this.board[capturedPawnRow][to.col] = null;
            }
        }

        // Set new en passant target if a pawn moves two squares
        if (piece.type === 'pawn' && Math.abs(from.row - to.row) === 2) {
            this.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col, color: piece.color };
        } else {
            this.enPassantTarget = null;
        }

        if (capturedPiece) {
            this.capturedPieces[this.currentPlayer].push(capturedPiece);
        }

        this.clearSelection();
        this.renderBoard();
        this.switchPlayer();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.checkGameEnd();

        this.undoBtn.disabled = false;

        if (this.gameMode === 'pvc' && this.currentPlayer !== this.playerColor && (this.gameState === 'playing' || this.gameState === 'check')) {
            this.isAITurn = true;
            this.gameStatusElement.textContent = 'AI is thinking...'; // Indicate AI is thinking
            this.requestAIMove();
        }
    }

    showPromotionModal() {
        this.promotionModal.style.display = 'flex';
    }

    handlePromotion(pieceType, isAIMove = false) {
        const lastMove = this.moveHistory[this.moveHistory.length - 1];
        if (!lastMove || !this.board[lastMove.to.row][lastMove.to.col] || this.board[lastMove.to.row][lastMove.to.col].type !== 'pawn') {
            console.error('Promotion error: Last move not a pawn promotion.');
            if (!isAIMove) this.promotionModal.style.display = 'none';
            return;
        }

        const pawn = this.board[lastMove.to.row][lastMove.to.col];
        this.board[lastMove.to.row][lastMove.to.col] = { type: pieceType, color: pawn.color };

        if (!isAIMove) {
            this.promotionModal.style.display = 'none';
            this.clearSelection();
            this.renderBoard();
            this.switchPlayer(); // Player was switched before promotion modal for player, switch again for AI
            this.updateGameInfo();
            this.updateMoveHistory(); // Update with promoted piece
            this.updateCapturedPieces();
            this.checkGameEnd();

            if (this.gameMode === 'pvc' && this.currentPlayer !== this.playerColor && (this.gameState === 'playing' || this.gameState === 'check')) {
                this.isAITurn = true;
                this.gameStatusElement.textContent = 'AI is thinking...';
                this.requestAIMove();
            }
        } else {
            // AI promotion is part of its move, board already rendered, player switched.
            // Just need to ensure game state is consistent.
            this.renderBoard(); // Re-render to show promoted piece from AI
            this.updateGameInfo();
            this.updateMoveHistory();
            this.checkGameEnd();
        }
    }

    undoMove() {
        if (this.moveHistory.length === 0) return;

        const lastMove = this.moveHistory.pop();
        const { previousState } = lastMove;

        this.board = JSON.parse(JSON.stringify(previousState.board));
        this.currentPlayer = previousState.currentPlayer;
        this.playerColor = previousState.playerColor;
        this.gameState = previousState.gameState;
        this.capturedPieces = JSON.parse(JSON.stringify(previousState.capturedPieces));
        this.hasKingMoved = JSON.parse(JSON.stringify(previousState.hasKingMoved));
        this.hasRookMoved = JSON.parse(JSON.stringify(previousState.hasRookMoved));
        this.enPassantTarget = previousState.enPassantTarget;

        // If playing against AI and it was AI's turn to be undone,
        // undo player's previous move as well so player can retry.
        if (this.gameMode === 'pvc' && this.currentPlayer !== this.playerColor && this.moveHistory.length > 0) {
            const playerMoveToUndo = this.moveHistory.pop();
            const { previousState: playerPreviousState } = playerMoveToUndo;
            this.board = JSON.parse(JSON.stringify(playerPreviousState.board));
            this.currentPlayer = playerPreviousState.currentPlayer;
            this.playerColor = playerPreviousState.playerColor;
            this.gameState = playerPreviousState.gameState;
            this.capturedPieces = JSON.parse(JSON.stringify(playerPreviousState.capturedPieces));
            this.hasKingMoved = JSON.parse(JSON.stringify(playerPreviousState.hasKingMoved));
            this.hasRookMoved = JSON.parse(JSON.stringify(playerPreviousState.hasRookMoved));
            this.enPassantTarget = playerPreviousState.enPassantTarget;
        }
        this.isAITurn = false; // Ensure AI turn is reset

        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory(previousState.moveHistoryLength);
        this.updateCapturedPieces();
        this.clearSelection();
        this.undoBtn.disabled = this.moveHistory.length === 0;
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
        if (this.isAITurn && this.gameMode === 'pvc') {
            statusText = 'AI is thinking...';
        } else if (this.gameState === 'check') {
            statusText = `${playerText} sotto scacco!`;
        } else if (this.gameState === 'checkmate') {
            const winner = this.currentPlayer === 'white' ? 'Nero' : 'Bianco';
            statusText = `Scacco matto! Vince ${winner}`;
        } else if (this.gameState === 'stalemate') {
            statusText = 'Stallo - Partita patta';
        } else if (this.gameState === 'resigned_white') {
            statusText = 'Bianco si è arreso. Vince Nero!';
        } else if (this.gameState === 'resigned_black') {
            statusText = 'Nero si è arreso. Vince Bianco!';
        } else if (this.gameState === 'draw_agreed') {
            statusText = 'Patta concordata!';
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
        // Randomize starting player in PVC mode
        if (this.gameMode === 'pvc') {
            this.playerColor = Math.random() < 0.5 ? 'white' : 'black';
            this.currentPlayer = 'white'; // Game always starts with white's turn
            console.log(`New PVC game. Player is: ${this.playerColor}. Current turn: ${this.currentPlayer}`);
        } else {
            this.playerColor = 'white'; // Default for PvP or if player is white
            this.currentPlayer = 'white';
        }

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
        // this.isAITurn = false; // Reset isAITurn status

        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.clearSelection();
        this.undoBtn.disabled = true;
        this.resignBtn.disabled = false;
        this.offerDrawBtn.disabled = false;

        if (this.gameMode === 'pvc' && this.currentPlayer !== this.playerColor) {
            this.isAITurn = true;
            this.gameStatusElement.textContent = 'AI is thinking...';
            this.requestAIMove();
        } else {
            this.isAITurn = false;
        }
        // Reset Stockfish for the new game
        this.stockfish.postMessage('ucinewgame');
        this.stockfish.postMessage('isready');
        if (this.analysisPanelVisible) {
            this.currentAnalysis = "New game started.\n";
            this.analysisOutput.textContent = this.currentAnalysis;
        }

    }

    resignGame() {
        if (this.gameState === 'playing' || this.gameState === 'check') {
            this.gameState = this.currentPlayer === 'white' ? 'resigned_white' : 'resigned_black';
            this.updateGameInfo();
            this.disableBoardInteraction();
            alert(`${this.currentPlayer} has resigned. The opponent wins!`);
        }
    }

    offerDraw() {
        if (this.gameState === 'playing' || this.gameState === 'check') {
            // In a real application, this would send a draw offer to the opponent.
            // For PVC, AI might accept/reject. For PvP, other player would respond.
            // Here, we'll just log it and for PVC, AI will ignore it for now.
            if (this.gameMode === 'pvc') {
                alert("You offered a draw. The AI is not programmed to respond to draw offers yet.");
                // Future: Implement AI logic for draw offers
            } else {
                // For PvP, this would require communication with the other player.
                // Simulate immediate agreement for simplicity in this version.
                if (confirm("Offer a draw? If the opponent accepts, the game is a draw.")) {
                    this.gameState = 'draw_agreed';
                    this.updateGameInfo();
                    this.disableBoardInteraction();
                    alert("Draw agreed!");
                } else {
                    alert("Draw offer declined or cancelled.");
                }
            }
        }
    }

    toggleAnalysisPanel(show) {
        if (show === undefined) {
            this.analysisPanelVisible = !this.analysisPanelVisible;
        } else {
            this.analysisPanelVisible = show;
        }
        this.analysisPanel.style.display = this.analysisPanelVisible ? 'block' : 'none';
        this.toggleAnalysisBtn.textContent = this.analysisPanelVisible ? 'Hide Analysis' : 'Show Analysis';
        if (this.analysisPanelVisible) {
            this.currentAnalysis = "Stockfish Analysis Panel Activated.\n";
            this.analysisOutput.textContent = this.currentAnalysis;
            // Optionally, start analysis immediately if it's a player's turn
            if (this.gameMode === 'pvc' && this.currentPlayer === this.playerColor && (this.gameState === 'playing' || this.gameState === 'check')) {
                this.requestAnalysisForCurrentPosition();
            }
        } else {
            // Stop ongoing analysis if panel is hidden
            this.stockfish.postMessage('stop');
        }
    }

    requestAnalysisForCurrentPosition() {
        if (!this.analysisPanelVisible || (this.gameState !== 'playing' && this.gameState !== 'check')) return;
        this.gameStatusElement.textContent = 'Analyzing position...'; // Update status
        const fen = this.boardToFEN();
        this.currentAnalysis = `Requesting analysis for FEN: ${fen}\n`;
        this.analysisOutput.textContent = this.currentAnalysis;
        this.stockfish.postMessage(`position fen ${fen}`);
        this.stockfish.postMessage(`go depth ${this.aiDifficulty} multipv 3`); // multipv for more lines
    }

    disableBoardInteraction() {
        // This could involve setting a flag or directly disabling event listeners on squares
        // For simplicity, we rely on the gameState checks in handleSquareClick
        this.resignBtn.disabled = true;
        this.offerDrawBtn.disabled = true;
        this.undoBtn.disabled = true; // Usually disable undo after game ends
    }

    // Make sure setAIDifficulty is correctly defined
    setAIDifficulty(difficulty) {
        this.aiDifficulty = difficulty;
        if (this.gameMode === 'pvc' && this.isAITurn) {
            console.log("AI difficulty changed to: ", difficulty);
            // Optionally, you might want to stop current AI thinking and restart with new depth
            // this.stockfish.postMessage('stop');
            // this.requestAIMove(); 
        }
    }

    setGameMode(mode) {
        this.gameMode = mode;
        console.log(`Game mode changed to: ${mode}`);

        // Show/hide AI difficulty based on game mode
        if (this.aiDifficultySetting) { // Target the wrapper div
            this.aiDifficultySetting.style.display = mode === 'pvc' ? 'block' : 'none';
        }

        // Reset the game for the new mode AFTER updating UI elements
        this.newGame();
    }

    setupStockfish() {
        this.stockfish.onmessage = (event) => {
            const message = event.data;
            // console.log('Stockfish:', message); // For debugging

            if (this.analysisPanelVisible) {
                this.currentAnalysis += message + '\n';
                this.analysisOutput.textContent = this.currentAnalysis;
                this.analysisOutput.scrollTop = this.analysisOutput.scrollHeight; // Auto-scroll
            }

            if (message.startsWith('bestmove')) {
                // Ensure AI turn flag is appropriately managed before and after this
                const move = message.split(' ')[1];
                if (this.isAITurn) { // Double check it is AI's turn to make a move
                    this.handleAIMove(move);
                }
                // Stop analysis after AI makes its move if it was running for the move itself
                // this.stockfish.postMessage('stop'); 
            }
        };
        this.stockfish.postMessage('uci');
        this.stockfish.postMessage('isready');
        this.stockfish.postMessage('ucinewgame');
    }

    requestAIMove() {
        if (!this.isAITurn || this.gameState !== 'playing') return;

        const fen = this.boardToFEN();
        this.stockfish.postMessage(`position fen ${fen}`);

        // Adjust the depth based on game progress or set difficulty
        const depth = this.aiDifficulty; // You can customize this logic
        this.stockfish.postMessage(`go depth ${depth}`);
    }

    handleAIMove(algebraicMove) {
        if (!this.isAITurn) return; // Should not happen if logic is correct

        console.log(`AI proposes move: ${algebraicMove}`);
        const fromAlg = algebraicMove.substring(0, 2);
        const toAlg = algebraicMove.substring(2, 4);
        const promotionPieceType = algebraicMove.length === 5 ? algebraicMove.substring(4, 5) : null;

        const from = this.algebraicToCoords(fromAlg);
        const to = this.algebraicToCoords(toAlg);

        if (!from || !to) {
            console.error('Invalid algebraic move from AI:', algebraicMove);
            this.isAITurn = false; // Reset AI turn
            this.updateGameInfo();
            return;
        }

        const piece = this.board[from.row][from.col];
        if (!piece || piece.color === this.playerColor) {
            console.error('AI tried to move an invalid piece or player\'s piece:', algebraicMove, piece);
            this.isAITurn = false;
            this.updateGameInfo();
            return;
        }

        // Simulate makeMove without triggering another AI move immediately
        const capturedPiece = this.board[to.row][to.col];
        const previousState = { // Simplified state for AI move, undo will handle full restoration
            board: JSON.parse(JSON.stringify(this.board)),
            currentPlayer: this.currentPlayer,
            gameState: this.gameState,
            capturedPieces: JSON.parse(JSON.stringify(this.capturedPieces)),
            hasKingMoved: JSON.parse(JSON.stringify(this.hasKingMoved)),
            hasRookMoved: JSON.parse(JSON.stringify(this.hasRookMoved)),
            enPassantTarget: this.enPassantTarget,
            moveHistoryLength: this.moveHistory.length
        };
        this.moveHistory.push({ from, to, piece, capturedPiece, previousState, algebraic: algebraicMove });


        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;

        // Handle castling for AI
        if (piece.type === 'king') {
            this.hasKingMoved[piece.color] = true;
            if (to.col - from.col === 2) { // Kingside
                this.board[from.row][5] = this.board[from.row][7];
                this.board[from.row][7] = null;
                this.hasRookMoved[piece.color].kingside = true;
            } else if (to.col - from.col === -2) { // Queenside
                this.board[from.row][3] = this.board[from.row][0];
                this.board[from.row][0] = null;
                this.hasRookMoved[piece.color].queenside = true;
            }
        }
        if (piece.type === 'rook') {
            if (from.col === 0 && from.row === (piece.color === 'white' ? 7 : 0)) this.hasRookMoved[piece.color].queenside = true;
            if (from.col === 7 && from.row === (piece.color === 'white' ? 7 : 0)) this.hasRookMoved[piece.color].kingside = true;
        }


        // Handle AI pawn promotion
        if (promotionPieceType) {
            const promotedPiece = promotionPieceType === 'q' ? 'queen' :
                promotionPieceType === 'r' ? 'rook' :
                    promotionPieceType === 'b' ? 'bishop' :
                        promotionPieceType === 'n' ? 'knight' : 'queen'; // Default to queen
            this.board[to.row][to.col] = { type: promotedPiece, color: piece.color };
            // Update move history with promotion info for AI
            this.moveHistory[this.moveHistory.length - 1].promotion = true;
            this.moveHistory[this.moveHistory.length - 1].promotedTo = promotedPiece;
        }

        // Handle en passant capture for AI
        if (piece.type === 'pawn' && this.enPassantTarget && to.row === this.enPassantTarget.row && to.col === this.enPassantTarget.col) {
            const capturedPawnRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
            const enPassantCapturedPiece = this.board[capturedPawnRow][to.col];
            if (enPassantCapturedPiece) {
                this.capturedPieces[this.currentPlayer].push(enPassantCapturedPiece); // AI is current player here
                this.board[capturedPawnRow][to.col] = null;
            }
        }

        // Set new en passant target if AI pawn moves two squares
        if (piece.type === 'pawn' && Math.abs(from.row - to.row) === 2) {
            this.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col, color: piece.color };
        } else {
            this.enPassantTarget = null;
        }


        if (capturedPiece) {
            this.capturedPieces[this.currentPlayer].push(capturedPiece); // AI is current player here
        }

        this.isAITurn = false; // AI's turn is over
        this.switchPlayer(); // Switch back to player
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.checkGameEnd();
        this.undoBtn.disabled = false;

        // If analysis panel is visible, request analysis for the new position from player's perspective
        if (this.analysisPanelVisible && (this.gameState === 'playing' || this.gameState === 'check')) {
            this.requestAnalysisForCurrentPosition();
        }
    }

    algebraicToCoords(alg) {
        const col = alg.charCodeAt(0) - 97;
        const row = 8 - parseInt(alg.charAt(1), 10);
        return this.isInBounds(row, col) ? { row, col } : null;
    }

    boardToFEN() {
        let fen = '';
        for (let r = 0; r < 8; r++) {
            let emptySquares = 0;
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece) {
                    if (emptySquares > 0) {
                        fen += emptySquares;
                        emptySquares = 0;
                    }
                    let fenChar = piece.type.toLowerCase();
                    if (piece.color === 'white') {
                        fenChar = fenChar.toUpperCase();
                    }
                    // Stockfish.js uses p, n, b, r, q, k
                    if (fenChar === 'N' && piece.type === 'knight') fenChar = 'N';
                    else if (fenChar === 'n' && piece.type === 'knight') fenChar = 'n';
                    else fenChar = piece.type.charAt(0);

                    if (piece.color === 'white') {
                        fen += fenChar.toUpperCase();
                    } else {
                        fen += fenChar.toLowerCase();
                    }

                } else {
                    emptySquares++;
                }
            }
            if (emptySquares > 0) {
                fen += emptySquares;
            }
            if (r < 7) {
                fen += '/';
            }
        }

        // Active color
        fen += this.currentPlayer === 'white' ? ' w' : ' b';

        // Castling availability
        let castling = '';
        if (!this.hasKingMoved.white) {
            if (!this.hasRookMoved.white.kingside) castling += 'K';
            if (!this.hasRookMoved.white.queenside) castling += 'Q';
        }
        if (!this.hasKingMoved.black) {
            if (!this.hasRookMoved.black.kingside) castling += 'k';
            if (!this.hasRookMoved.black.queenside) castling += 'q';
        }
        fen += castling.length > 0 ? ` ${castling}` : ' -';

        // En passant target square
        if (this.enPassantTarget) {
            const col = String.fromCharCode(97 + this.enPassantTarget.col);
            const row = 8 - this.enPassantTarget.row;
            fen += ` ${col}${row}`;
        } else {
            fen += ' -';
        }

        // Halfmove clock (simplified, not strictly necessary for basic Stockfish interaction)
        fen += ' 0';

        // Fullmove number (simplified)
        fen += ` ${Math.floor(this.moveHistory.length / 2) + 1}`;

        return fen;
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chessGame = new ChessGame();
});
