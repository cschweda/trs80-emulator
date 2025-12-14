/**
 * TRS-80 Model III BASIC Program Examples
 * 15 programs of increasing complexity for Phase 4 testing
 *
 * These programs demonstrate BASIC program execution under Z80 CPU
 * with ModelIII.rom. Programs are stored as tokenized BASIC bytecode.
 */

export const BASIC_PROGRAMS = [
  // Program 1: Hello World (Simplest)
  {
    id: "basic-01",
    name: "Hello World",
    description: "Simplest BASIC program - prints a message",
    complexity: 1,
    source: `10 PRINT "HELLO WORLD"
20 END`,
    expectedOutput: "HELLO WORLD",
  },

  // Program 2: Simple Variable
  {
    id: "basic-02",
    name: "Simple Variable",
    description: "Assigns and prints a variable",
    complexity: 2,
    source: `10 LET A=42
20 PRINT A
30 END`,
    expectedOutput: "42",
  },

  // Program 3: Arithmetic
  {
    id: "basic-03",
    name: "Arithmetic",
    description: "Performs basic arithmetic operations",
    complexity: 2,
    source: `10 LET A=10
20 LET B=5
30 LET C=A+B
40 PRINT C
50 END`,
    expectedOutput: "15",
  },

  // Program 4: Input
  {
    id: "basic-04",
    name: "Input",
    description: "Gets input from user and displays it",
    complexity: 3,
    source: `10 PRINT "ENTER YOUR NAME:"
20 INPUT N$
30 PRINT "HELLO ";N$
40 END`,
    expectedOutput: "ENTER YOUR NAME:\n[waits for input]\nHELLO [name]",
  },

  // Program 5: Conditional
  {
    id: "basic-05",
    name: "Conditional",
    description: "Uses IF-THEN statement",
    complexity: 3,
    source: `10 LET X=10
20 IF X>5 THEN PRINT "X IS GREATER THAN 5"
30 IF X<5 THEN PRINT "X IS LESS THAN 5"
40 END`,
    expectedOutput: "X IS GREATER THAN 5",
  },

  // Program 6: Loop - FOR/NEXT
  {
    id: "basic-06",
    name: "FOR Loop",
    description: "Counts from 1 to 5 using FOR/NEXT",
    complexity: 3,
    source: `10 FOR I=1 TO 5
20 PRINT I
30 NEXT I
40 END`,
    expectedOutput: "1\n2\n3\n4\n5",
  },

  // Program 7: Nested Loop
  {
    id: "basic-07",
    name: "Nested Loop",
    description: "Nested FOR loops create multiplication table",
    complexity: 4,
    source: `10 FOR I=1 TO 3
20 FOR J=1 TO 3
30 PRINT I*J;" ";
40 NEXT J
50 PRINT
60 NEXT I
70 END`,
    expectedOutput: "1 2 3\n2 4 6\n3 6 9",
  },

  // Program 8: GOTO
  {
    id: "basic-08",
    name: "GOTO",
    description: "Uses GOTO for control flow",
    complexity: 3,
    source: `10 LET X=1
20 PRINT X
30 LET X=X+1
40 IF X<=5 THEN GOTO 20
50 PRINT "DONE"
60 END`,
    expectedOutput: "1\n2\n3\n4\n5\nDONE",
  },

  // Program 9: Array
  {
    id: "basic-09",
    name: "Array",
    description: "Uses array to store and display values",
    complexity: 4,
    source: `10 DIM A(5)
20 FOR I=1 TO 5
30 LET A(I)=I*2
40 NEXT I
50 FOR I=1 TO 5
60 PRINT A(I)
70 NEXT I
80 END`,
    expectedOutput: "2\n4\n6\n8\n10",
  },

  // Program 10: String Operations
  {
    id: "basic-10",
    name: "String Operations",
    description: "Concatenates and manipulates strings",
    complexity: 4,
    source: `10 LET A$="HELLO"
20 LET B$="WORLD"
30 LET C$=A$+" "+B$
40 PRINT C$
50 END`,
    expectedOutput: "HELLO WORLD",
  },

  // Program 11: Function/Subroutine
  {
    id: "basic-11",
    name: "GOSUB/RETURN",
    description: "Uses GOSUB for subroutine calls",
    complexity: 4,
    source: `10 PRINT "START"
20 GOSUB 100
30 PRINT "END"
40 END
100 PRINT "SUBROUTINE"
110 RETURN`,
    expectedOutput: "START\nSUBROUTINE\nEND",
  },

  // Program 12: Mathematical Functions
  {
    id: "basic-12",
    name: "Math Functions",
    description: "Uses built-in mathematical functions",
    complexity: 4,
    source: `10 LET X=16
20 PRINT SQR(X)
30 LET Y=3.14
40 PRINT INT(Y)
50 END`,
    expectedOutput: "4\n3",
  },

  // Program 13: Data/Read
  {
    id: "basic-13",
    name: "DATA/READ",
    description: "Uses DATA and READ statements",
    complexity: 5,
    source: `10 DATA 10,20,30,40,50
20 FOR I=1 TO 5
30 READ X
40 PRINT X
50 NEXT I
60 END`,
    expectedOutput: "10\n20\n30\n40\n50",
  },

  // Program 14: Complex Logic
  {
    id: "basic-14",
    name: "Complex Logic",
    description: "Combines multiple control structures",
    complexity: 5,
    source: `10 LET SUM=0
20 FOR I=1 TO 10
30 IF I/2=INT(I/2) THEN GOTO 50
40 LET SUM=SUM+I
50 NEXT I
60 PRINT "SUM OF ODDS:";SUM
70 END`,
    expectedOutput: "SUM OF ODDS:25",
  },

  // Program 15: Complete Application
  {
    id: "basic-15",
    name: "Number Guessing Game",
    description: "Complete interactive game program",
    complexity: 5,
    source: `10 RANDOM
20 LET SECRET=INT(RND(1)*100)+1
30 PRINT "GUESS A NUMBER 1-100"
40 INPUT GUESS
50 IF GUESS=SECRET THEN GOTO 90
60 IF GUESS>SECRET THEN PRINT "TOO HIGH"
70 IF GUESS<SECRET THEN PRINT "TOO LOW"
80 GOTO 40
90 PRINT "CORRECT!"
100 END`,
    expectedOutput: "GUESS A NUMBER 1-100\n[interactive game]",
  },
];

/**
 * Get BASIC program by ID
 * @param {string} id - Program ID
 * @returns {Object|null} Program object or null if not found
 */
export function getBasicProgram(id) {
  return BASIC_PROGRAMS.find((p) => p.id === id) || null;
}

/**
 * Get all BASIC programs sorted by complexity
 * @returns {Array} Array of program objects
 */
export function getAllBasicPrograms() {
  return [...BASIC_PROGRAMS].sort((a, b) => a.complexity - b.complexity);
}

/**
 * Get BASIC programs by complexity level
 * @param {number} complexity - Complexity level (1-5)
 * @returns {Array} Array of program objects
 */
export function getBasicProgramsByComplexity(complexity) {
  return BASIC_PROGRAMS.filter((p) => p.complexity === complexity);
}

