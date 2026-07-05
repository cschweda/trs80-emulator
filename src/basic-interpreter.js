/**
 * TRS-80 Model III Level II BASIC Interpreter
 * Full implementation of BASIC statements and functions
 */

export class BasicInterpreter {
  constructor(logFn, onInputRequest) {
    this.logFn = logFn;
    this.onInputRequest = onInputRequest; // Callback for INPUT statements

    // Program storage
    this.program = {}; // line number -> line text

    // Runtime state
    this.variables = {}; // variable name -> value
    this.arrays = {}; // array name -> array data
    this.dataPointer = 0;
    this.dataValues = [];
    this.gosubStack = []; // Stack for GOSUB/RETURN
    this.forStack = []; // Stack for FOR/NEXT loops
    this.userFunctions = {}; // User-defined functions (DEF FN)
    this.onPoke = null; // Callback for POKE operations
    this.onSetPixel = null; // Callback for SET command
    this.onResetPixel = null; // Callback for RESET command
    this.onPointPixel = null; // Callback for POINT function

    // Execution state
    this.currentLineIndex = 0;
    this.lineNumbers = [];
    this.programRunning = false;
    this.shouldBreak = false;
  }

  /**
   * Load a program (from entered lines or loaded program)
   */
  loadProgram(programLines) {
    this.program = {};
    if (typeof programLines === "object" && !Array.isArray(programLines)) {
      // Already in line number -> text format
      this.program = { ...programLines };
    } else if (Array.isArray(programLines)) {
      // Array of lines
      programLines.forEach((line) => {
        const match = line.match(/^(\d+)\s+(.+)$/);
        if (match) {
          this.program[parseInt(match[1])] = match[2].trim();
        }
      });
    } else if (typeof programLines === "string") {
      // String with newlines
      programLines.split("\n").forEach((line) => {
        const match = line.trim().match(/^(\d+)\s+(.+)$/);
        if (match) {
          this.program[parseInt(match[1])] = match[2].trim();
        }
      });
    }

    // Update line numbers
    this.lineNumbers = Object.keys(this.program)
      .map((n) => parseInt(n))
      .sort((a, b) => a - b);
  }

  /**
   * Run the program
   */
  async run() {
    this.programRunning = true;
    this.shouldBreak = false;
    this.currentLineIndex = 0;
    this.gosubStack = [];
    this.forStack = [];
    this.dataPointer = 0;

    let executionCount = 0;
    const maxIterations = 1000000;

    try {
      while (
        this.programRunning &&
        !this.shouldBreak &&
        this.currentLineIndex < this.lineNumbers.length
      ) {
        if (executionCount++ > maxIterations) {
          this.logFn("?OM ERROR", "error");
          break;
        }

        const lineNum = this.lineNumbers[this.currentLineIndex];
        const line = this.program[lineNum];

        await this.executeLine(lineNum, line);

        if (!this.programRunning || this.shouldBreak) {
          break;
        }

        // If we haven't jumped, move to next line
        if (this.currentLineIndex < this.lineNumbers.length) {
          // Check if we're still on the same line (means no jump occurred)
          const stillOnSameLine =
            this.lineNumbers[this.currentLineIndex] === lineNum;
          if (stillOnSameLine) {
            this.currentLineIndex++;
          }
        }
      }
    } catch (error) {
      this.logFn(`?${error.message} ERROR`, "error");
    }

    this.programRunning = false;
  }

  /**
   * Execute a single line
   */
  async executeLine(lineNum, line) {
    const upperLine = line.toUpperCase().trim();
    const parts = this.parseStatement(line);

    if (parts.length === 0) return;

    const statement = parts[0].toUpperCase();

    // Handle multi-statement lines (separated by :)
    const statements = line.split(":").map((s) => s.trim());
    for (const stmt of statements) {
      await this.executeStatement(stmt.trim());
      if (this.shouldBreak || !this.programRunning) break;
    }
  }

  /**
   * Execute a single statement
   */
  async executeStatement(stmt) {
    const upperStmt = stmt.toUpperCase().trim();

    // PRINT statement
    if (upperStmt.startsWith("PRINT")) {
      await this.executePRINT(stmt);
    }
    // LET statement (or implicit assignment)
    else if (upperStmt.includes("=") && !upperStmt.startsWith("IF")) {
      await this.executeLET(stmt);
    }
    // INPUT statement
    else if (upperStmt.startsWith("INPUT")) {
      await this.executeINPUT(stmt);
    }
    // GOTO statement
    else if (upperStmt.startsWith("GOTO")) {
      await this.executeGOTO(stmt);
    }
    // GOSUB statement
    else if (upperStmt.startsWith("GOSUB")) {
      await this.executeGOSUB(stmt);
    }
    // RETURN statement
    else if (upperStmt === "RETURN") {
      await this.executeRETURN();
    }
    // IF-THEN statement
    else if (upperStmt.startsWith("IF")) {
      await this.executeIF(stmt);
    }
    // FOR statement
    else if (upperStmt.startsWith("FOR")) {
      await this.executeFOR(stmt);
    }
    // NEXT statement
    else if (upperStmt.startsWith("NEXT")) {
      await this.executeNEXT(stmt);
    }
    // DATA statement
    else if (upperStmt.startsWith("DATA")) {
      // DATA is just stored, no execution needed
      await this.executeDATA(stmt);
    }
    // READ statement
    else if (upperStmt.startsWith("READ")) {
      await this.executeREAD(stmt);
    }
    // RESTORE statement
    else if (upperStmt === "RESTORE") {
      this.dataPointer = 0;
    }
    // DIM statement
    else if (upperStmt.startsWith("DIM")) {
      await this.executeDIM(stmt);
    }
    // STOP statement
    else if (upperStmt === "STOP") {
      this.logFn(
        "BREAK IN " + this.lineNumbers[this.currentLineIndex],
        "error"
      );
      this.programRunning = false;
    }
    // CONT statement (continue after STOP)
    else if (upperStmt === "CONT") {
      // Continue from where we stopped (programRunning will be set back to true by caller)
      this.programRunning = true;
    }
    // CLEAR statement
    else if (upperStmt.startsWith("CLEAR")) {
      this.variables = {};
      this.arrays = {};
      this.dataPointer = 0;
      this.dataValues = [];
    }
    // CLS statement (clear screen)
    else if (upperStmt === "CLS") {
      // Clear screen - handled by UI
      this.logFn("\x1B[2J", "info"); // ANSI clear screen (if supported)
    }
    // ON-GOTO statement
    else if (upperStmt.startsWith("ON")) {
      const onMatch = upperStmt.match(/^ON\s+(.+)\s+GOTO\s+(.+)$/i);
      if (onMatch) {
        await this.executeONGOTO(stmt);
      } else {
        const onGosubMatch = upperStmt.match(/^ON\s+(.+)\s+GOSUB\s+(.+)$/i);
        if (onGosubMatch) {
          await this.executeONGOSUB(stmt);
        } else {
          this.logFn(`?SN ERROR`, "error");
        }
      }
    }
    // DEF FN statement (user-defined functions)
    else if (upperStmt.startsWith("DEF FN")) {
      await this.executeDEFFN(stmt);
    }
    // POKE statement
    else if (upperStmt.startsWith("POKE")) {
      await this.executePOKE(stmt);
    }
    // PEEK function (handled in expression evaluation)
    // LPRINT statement
    else if (upperStmt.startsWith("LPRINT")) {
      await this.executeLPRINT(stmt);
    }
    // RANDOMIZE statement
    else if (upperStmt.startsWith("RANDOMIZE")) {
      // Seed random number generator
      const seed = stmt.substring(9).trim();
      if (seed) {
        const seedValue = this.evaluateExpression(seed);
        // Use seed to initialize random (simplified)
        Math.seedrandom = seedValue;
      }
    }
    // SET statement (graphics)
    else if (upperStmt.startsWith("SET")) {
      await this.executeSET(stmt);
    }
    // RESET statement (graphics)
    else if (upperStmt.startsWith("RESET")) {
      await this.executeRESET(stmt);
    }
    // POINT function (graphics - handled in expression evaluation)
    // END statement
    else if (upperStmt === "END") {
      this.programRunning = false;
    }
    // REM statement (comment)
    else if (upperStmt.startsWith("REM")) {
      // Do nothing
    }
    // Unknown statement
    else {
      // Try to parse as expression or assignment
      if (upperStmt.includes("=")) {
        await this.executeLET(stmt);
      } else {
        this.logFn(`?SN ERROR`, "error");
      }
    }
  }

  /**
   * Execute PRINT statement
   */
  async executePRINT(stmt) {
    const content = stmt.substring(5).trim();
    if (content.length === 0) {
      this.logFn("", "output");
      return;
    }

    // Parse PRINT items (separated by , or ;)
    const items = this.parsePrintItems(content);
    let output = "";
    let needNewline = true;

    for (let i = 0; i < items.length; i++) {
      const item = items[i].trim();

      if (item === "") continue;

      // Check for trailing semicolon or comma
      const hasSemicolon = stmt.includes(";") && i < items.length - 1;
      const hasComma = stmt.includes(",") && i < items.length - 1;

      if (item.startsWith('"') && item.endsWith('"')) {
        // String literal
        output += item.slice(1, -1);
      } else if (item.toUpperCase().startsWith("TAB(")) {
        // TAB function
        const tabMatch = item.match(/TAB\s*\(([^)]+)\)/i);
        if (tabMatch) {
          const tabPos = Math.floor(this.evaluateExpression(tabMatch[1]));
          const currentLen = output.length;
          const spaces = Math.max(0, tabPos - currentLen - 1);
          output += " ".repeat(spaces);
        }
      } else {
        // Expression
        const value = this.evaluateExpression(item);
        output += String(value);
      }

      // Handle comma (tab to next zone) or semicolon (no space)
      if (hasComma && i < items.length - 1) {
        // Tab to next print zone (simplified - just add spaces)
        const currentLen = output.length;
        const nextZone = Math.ceil((currentLen + 1) / 14) * 14;
        output += " ".repeat(nextZone - currentLen);
      } else if (!hasSemicolon && i < items.length - 1) {
        output += " ";
      }
    }

    if (output.length > 0 || needNewline) {
      this.logFn(output, "output");
    }

    await this.delay(10);
  }

  /**
   * Parse PRINT items (handles commas, semicolons, and expressions)
   */
  parsePrintItems(content) {
    const items = [];
    let current = "";
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (
        (char === '"' || char === "'") &&
        (i === 0 || content[i - 1] !== "\\")
      ) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        current += char;
      } else if ((char === "," || char === ";") && !inString) {
        if (current.trim()) {
          items.push(current.trim());
        }
        items.push(char); // Keep separator
        current = "";
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      items.push(current.trim());
    }

    // Recombine items, grouping by separators
    const result = [];
    let currentItem = "";
    for (let i = 0; i < items.length; i++) {
      if (items[i] === "," || items[i] === ";") {
        if (currentItem) {
          result.push(currentItem);
          currentItem = "";
        }
        // Separator is handled in executePRINT
      } else {
        if (currentItem) currentItem += " ";
        currentItem += items[i];
      }
    }
    if (currentItem) {
      result.push(currentItem);
    }

    return result.length > 0 ? result : [content];
  }

  /**
   * Execute LET statement (or implicit assignment)
   */
  async executeLET(stmt) {
    // Remove "LET " if present
    let assignment = stmt;
    if (assignment.toUpperCase().startsWith("LET ")) {
      assignment = assignment.substring(4).trim();
    }

    const match = assignment.match(
      /^([A-Z][A-Z0-9]*\$?)(\([^)]+\))?\s*=\s*(.+)$/
    );
    if (!match) {
      this.logFn(`?SN ERROR`, "error");
      return;
    }

    const varName = match[1];
    const arrayIndex = match[2] ? match[2].slice(1, -1) : null;
    const expr = match[3].trim();

    const value = this.evaluateExpression(expr);

    if (arrayIndex) {
      // Array assignment
      const index = Math.floor(this.evaluateExpression(arrayIndex));
      if (!this.arrays[varName]) {
        this.arrays[varName] = {};
      }
      this.arrays[varName][index] = value;
    } else {
      // Variable assignment
      this.variables[varName] = value;
    }
  }

  /**
   * Execute INPUT statement
   */
  async executeINPUT(stmt) {
    const content = stmt.substring(5).trim();

    // Parse prompt and variable list
    let prompt = "";
    let vars = [];

    if (content.startsWith('"')) {
      // Has prompt string
      const endQuote = content.indexOf('"', 1);
      if (endQuote !== -1) {
        prompt = content.substring(1, endQuote);
        vars = content
          .substring(endQuote + 1)
          .split(",")
          .map((v) => v.trim());
      }
    } else {
      vars = content.split(",").map((v) => v.trim());
    }

    if (prompt) {
      this.logFn(prompt, "info");
    } else {
      this.logFn("?", "info");
    }

    // Request input from user
    if (this.onInputRequest) {
      const input = await this.onInputRequest(prompt || "?");
      const values = input.split(",").map((v) => v.trim());

      for (let i = 0; i < vars.length && i < values.length; i++) {
        const varName = vars[i];
        const value = values[i];

        // Try to parse as number, otherwise store as string
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && varName[varName.length - 1] !== "$") {
          this.variables[varName] = numValue;
        } else {
          this.variables[varName] = value;
        }
      }
    }
  }

  /**
   * Execute GOTO statement
   */
  async executeGOTO(stmt) {
    const target = stmt.substring(4).trim();
    const targetLine = parseInt(this.evaluateExpression(target));

    const targetIndex = this.lineNumbers.indexOf(targetLine);
    if (targetIndex !== -1) {
      this.currentLineIndex = targetIndex;
    } else {
      this.logFn(`?UL ERROR`, "error");
      this.programRunning = false;
    }
  }

  /**
   * Execute GOSUB statement
   */
  async executeGOSUB(stmt) {
    const target = stmt.substring(5).trim();
    const targetLine = parseInt(this.evaluateExpression(target));

    // Push return address (current line + 1)
    const currentLine = this.lineNumbers[this.currentLineIndex];
    this.gosubStack.push(this.currentLineIndex + 1);

    const targetIndex = this.lineNumbers.indexOf(targetLine);
    if (targetIndex !== -1) {
      this.currentLineIndex = targetIndex;
    } else {
      this.logFn(`?UL ERROR`, "error");
      this.programRunning = false;
    }
  }

  /**
   * Execute RETURN statement
   */
  async executeRETURN() {
    if (this.gosubStack.length === 0) {
      this.logFn(`?RG ERROR`, "error");
      this.programRunning = false;
      return;
    }

    const returnIndex = this.gosubStack.pop();
    if (returnIndex < this.lineNumbers.length) {
      this.currentLineIndex = returnIndex;
    } else {
      this.programRunning = false;
    }
  }

  /**
   * Execute IF-THEN statement
   */
  async executeIF(stmt) {
    const thenMatch = stmt.toUpperCase().match(/^IF\s+(.+)\s+THEN\s+(.+)$/);
    if (!thenMatch) {
      this.logFn(`?SN ERROR`, "error");
      return;
    }

    const condition = thenMatch[1].trim();
    const thenPart = thenMatch[2].trim();

    const conditionResult = this.evaluateCondition(condition);

    if (conditionResult) {
      // Execute THEN part
      const thenLineNum = parseInt(thenPart);
      if (!isNaN(thenLineNum)) {
        // THEN is a line number
        await this.executeGOTO(`GOTO ${thenLineNum}`);
      } else {
        // THEN is a statement
        await this.executeStatement(thenPart);
      }
    }
  }

  /**
   * Execute FOR statement
   */
  async executeFOR(stmt) {
    const forMatch = stmt
      .toUpperCase()
      .match(
        /^FOR\s+([A-Z][A-Z0-9]*)\s*=\s*(.+)\s+TO\s+(.+)(\s+STEP\s+(.+))?$/
      );
    if (!forMatch) {
      this.logFn(`?SN ERROR`, "error");
      return;
    }

    const varName = forMatch[1];
    const startValue = this.evaluateExpression(forMatch[2].trim());
    const endValue = this.evaluateExpression(forMatch[3].trim());
    const stepValue = forMatch[5]
      ? this.evaluateExpression(forMatch[5].trim())
      : 1;

    // Set initial value
    this.variables[varName] = startValue;

    // Push FOR loop info onto stack
    this.forStack.push({
      varName: varName,
      endValue: endValue,
      stepValue: stepValue,
      returnIndex: this.currentLineIndex + 1,
    });
  }

  /**
   * Execute NEXT statement
   */
  async executeNEXT(stmt) {
    if (this.forStack.length === 0) {
      this.logFn(`?NF ERROR`, "error");
      this.programRunning = false;
      return;
    }

    const forLoop = this.forStack[this.forStack.length - 1];
    const varName = stmt.substring(4).trim().toUpperCase() || forLoop.varName;

    if (varName !== forLoop.varName) {
      this.logFn(`?NF ERROR`, "error");
      return;
    }

    // Increment variable
    this.variables[forLoop.varName] += forLoop.stepValue;

    // Check if loop should continue
    const shouldContinue =
      forLoop.stepValue > 0
        ? this.variables[forLoop.varName] <= forLoop.endValue
        : this.variables[forLoop.varName] >= forLoop.endValue;

    if (shouldContinue) {
      // Loop back to FOR statement
      this.currentLineIndex = forLoop.returnIndex - 1;
    } else {
      // Exit loop
      this.forStack.pop();
    }
  }

  /**
   * Execute DATA statement
   */
  async executeDATA(stmt) {
    const content = stmt.substring(4).trim();
    const values = this.parseDataValues(content);
    this.dataValues.push(...values);
  }

  /**
   * Parse DATA values
   */
  parseDataValues(content) {
    const values = [];
    let current = "";
    let inString = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (char === '"' && (i === 0 || content[i - 1] !== "\\")) {
        inString = !inString;
        current += char;
      } else if (char === "," && !inString) {
        if (current.trim()) {
          values.push(current.trim());
        }
        current = "";
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      values.push(current.trim());
    }

    return values;
  }

  /**
   * Execute READ statement
   */
  async executeREAD(stmt) {
    const vars = stmt
      .substring(4)
      .trim()
      .split(",")
      .map((v) => v.trim());

    // Collect all DATA statements first
    if (this.dataValues.length === 0) {
      this.collectDataStatements();
    }

    for (const varName of vars) {
      if (this.dataPointer >= this.dataValues.length) {
        this.logFn(`?OD ERROR`, "error");
        break;
      }

      const value = this.dataValues[this.dataPointer++];

      // Try to parse as number
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && varName[varName.length - 1] !== "$") {
        this.variables[varName] = numValue;
      } else {
        // Remove quotes if present
        const strValue =
          value.startsWith('"') && value.endsWith('"')
            ? value.slice(1, -1)
            : value;
        this.variables[varName] = strValue;
      }
    }
  }

  /**
   * Collect all DATA statements from program
   */
  collectDataStatements() {
    this.dataValues = [];
    for (const lineNum of this.lineNumbers) {
      const line = this.program[lineNum];
      if (line.toUpperCase().startsWith("DATA")) {
        const content = line.substring(4).trim();
        const values = this.parseDataValues(content);
        this.dataValues.push(...values);
      }
    }
  }

  /**
   * Execute DIM statement
   */
  async executeDIM(stmt) {
    const content = stmt.substring(3).trim();
    const dims = content.split(",").map((d) => d.trim());

    for (const dim of dims) {
      const match = dim.match(/^([A-Z][A-Z0-9]*\$?)\s*\((\d+)\)$/);
      if (match) {
        const varName = match[1];
        const size = parseInt(match[2]);
        this.arrays[varName] = new Array(size + 1).fill(0);
      }
    }
  }

  /**
   * Execute ON-GOTO statement
   */
  async executeONGOTO(stmt) {
    const onMatch = stmt.toUpperCase().match(/^ON\s+(.+)\s+GOTO\s+(.+)$/);
    if (!onMatch) {
      this.logFn(`?SN ERROR`, "error");
      return;
    }

    const expr = onMatch[1].trim();
    const lineList = onMatch[2]
      .trim()
      .split(",")
      .map((l) => parseInt(l.trim()));

    const index = Math.floor(this.evaluateExpression(expr));

    if (index < 1 || index > lineList.length) {
      this.logFn(`?FC ERROR`, "error");
      return;
    }

    const targetLine = lineList[index - 1];
    const targetIndex = this.lineNumbers.indexOf(targetLine);
    if (targetIndex !== -1) {
      this.currentLineIndex = targetIndex;
    } else {
      this.logFn(`?UL ERROR`, "error");
      this.programRunning = false;
    }
  }

  /**
   * Execute ON-GOSUB statement
   */
  async executeONGOSUB(stmt) {
    const onMatch = stmt.toUpperCase().match(/^ON\s+(.+)\s+GOSUB\s+(.+)$/);
    if (!onMatch) {
      this.logFn(`?SN ERROR`, "error");
      return;
    }

    const expr = onMatch[1].trim();
    const lineList = onMatch[2]
      .trim()
      .split(",")
      .map((l) => parseInt(l.trim()));

    const index = Math.floor(this.evaluateExpression(expr));

    if (index < 1 || index > lineList.length) {
      this.logFn(`?FC ERROR`, "error");
      return;
    }

    const targetLine = lineList[index - 1];

    // Push return address
    this.gosubStack.push(this.currentLineIndex + 1);

    const targetIndex = this.lineNumbers.indexOf(targetLine);
    if (targetIndex !== -1) {
      this.currentLineIndex = targetIndex;
    } else {
      this.logFn(`?UL ERROR`, "error");
      this.programRunning = false;
    }
  }

  /**
   * Execute DEF FN statement (user-defined functions)
   */
  async executeDEFFN(stmt) {
    // DEF FN is stored for later use when function is called
    // Format: DEF FNA(X)=expression
    const defMatch = stmt
      .toUpperCase()
      .match(/^DEF\s+FN([A-Z])\s*\(([A-Z])\)\s*=\s*(.+)$/);
    if (!defMatch) {
      this.logFn(`?SN ERROR`, "error");
      return;
    }

    const funcName = "FN" + defMatch[1];
    const paramName = defMatch[2];
    const expr = defMatch[3].trim();

    // Store function definition
    if (!this.userFunctions) {
      this.userFunctions = {};
    }
    this.userFunctions[funcName] = {
      param: paramName,
      expression: expr,
    };
  }

  /**
   * Execute POKE statement
   */
  async executePOKE(stmt) {
    const pokeMatch = stmt.toUpperCase().match(/^POKE\s+(.+),\s*(.+)$/);
    if (!pokeMatch) {
      this.logFn(`?SN ERROR`, "error");
      return;
    }

    const address = Math.floor(this.evaluateExpression(pokeMatch[1].trim()));
    const value = Math.floor(this.evaluateExpression(pokeMatch[2].trim()));

    // POKE writes to memory (if memory system is available)
    if (this.onPoke) {
      this.onPoke(address, value);
    }
  }

  /**
   * Execute LPRINT statement (print to printer)
   */
  async executeLPRINT(stmt) {
    // LPRINT works like PRINT but to printer
    // For now, just use regular PRINT
    const content = stmt.substring(6).trim();
    await this.executePRINT("PRINT " + content);
  }

  /**
   * Execute SET statement (graphics - set pixel)
   */
  async executeSET(stmt) {
    const setMatch = stmt.toUpperCase().match(/^SET\s*\(([^,]+),\s*([^)]+)\)$/);
    if (!setMatch) {
      this.logFn(`?SN ERROR`, "error");
      return;
    }

    const x = Math.floor(this.evaluateExpression(setMatch[1].trim()));
    const y = Math.floor(this.evaluateExpression(setMatch[2].trim()));

    if (this.onSetPixel) {
      this.onSetPixel(x, y);
    }
  }

  /**
   * Execute RESET statement (graphics - reset pixel)
   */
  async executeRESET(stmt) {
    const resetMatch = stmt
      .toUpperCase()
      .match(/^RESET\s*\(([^,]+),\s*([^)]+)\)$/);
    if (!resetMatch) {
      this.logFn(`?SN ERROR`, "error");
      return;
    }

    const x = Math.floor(this.evaluateExpression(resetMatch[1].trim()));
    const y = Math.floor(this.evaluateExpression(resetMatch[2].trim()));

    if (this.onResetPixel) {
      this.onResetPixel(x, y);
    }
  }

  /**
   * Evaluate a condition (returns boolean)
   */
  evaluateCondition(condition) {
    // Handle comparison operators
    const operators = [">=", "<=", "<>", ">", "<", "="];

    for (const op of operators) {
      const index = condition.indexOf(op);
      if (index !== -1) {
        const left = condition.substring(0, index).trim();
        const right = condition.substring(index + op.length).trim();

        const leftVal = this.evaluateExpression(left);
        const rightVal = this.evaluateExpression(right);

        switch (op) {
          case ">":
            return leftVal > rightVal;
          case "<":
            return leftVal < rightVal;
          case ">=":
            return leftVal >= rightVal;
          case "<=":
            return leftVal <= rightVal;
          case "<>":
            return leftVal !== rightVal;
          case "=":
            return leftVal == rightVal;
        }
      }
    }

    // No operator found - treat as boolean expression
    const value = this.evaluateExpression(condition);
    return value !== 0 && value !== "" && value !== false;
  }

  /**
   * Evaluate an expression
   */
  evaluateExpression(expr) {
    expr = expr.trim();
    if (!expr) return 0;

    // String literal
    if (
      (expr.startsWith('"') && expr.endsWith('"')) ||
      (expr.startsWith("'") && expr.endsWith("'"))
    ) {
      return expr.slice(1, -1);
    }

    // Variable reference
    const varMatch = expr.match(/^([A-Z][A-Z0-9]*\$?)(\([^)]+\))?$/);
    if (varMatch) {
      const varName = varMatch[1];
      const arrayIndex = varMatch[2] ? varMatch[2].slice(1, -1) : null;

      if (arrayIndex !== null) {
        const index = Math.floor(this.evaluateExpression(arrayIndex));
        if (this.arrays[varName] && this.arrays[varName][index] !== undefined) {
          return this.arrays[varName][index];
        }
        return 0;
      } else {
        return this.variables[varName] !== undefined
          ? this.variables[varName]
          : 0;
      }
    }

    // Function calls
    const funcMatch = expr.match(/^([A-Z]+)\s*\(([^)]*)\)$/);
    if (funcMatch) {
      const funcName = funcMatch[1].toUpperCase();
      const args = funcMatch[2]
        .split(",")
        .map((a) => this.evaluateExpression(a.trim()));

      // Check for user-defined functions (FNx)
      if (funcName.startsWith("FN") && funcName.length === 3) {
        return this.callUserFunction(funcName, args);
      }

      return this.callFunction(funcName, args);
    }

    // Check for user-defined functions without parentheses (FNx)
    const userFuncMatch = expr.match(/^FN([A-Z])$/);
    if (userFuncMatch && this.userFunctions) {
      const funcName = "FN" + userFuncMatch[1];
      if (this.userFunctions[funcName]) {
        // User function with no arguments
        return this.callUserFunction(funcName, []);
      }
    }

    // Arithmetic expression
    return this.evaluateArithmetic(expr);
  }

  /**
   * Evaluate arithmetic expression
   */
  evaluateArithmetic(expr) {
    // Replace variable references with their values first
    expr = this.replaceVariables(expr);

    // Handle parentheses
    while (expr.includes("(")) {
      const start = expr.lastIndexOf("(");
      const end = expr.indexOf(")", start);
      if (end === -1) break;

      const inner = expr.substring(start + 1, end);
      const result = this.evaluateArithmetic(inner);
      expr = expr.substring(0, start) + result + expr.substring(end + 1);
    }

    // Handle operators in order of precedence
    // Multiplication and division
    expr = expr.replace(/([\d.]+)\s*\*\s*([\d.]+)/g, (match, a, b) => {
      return String(parseFloat(a) * parseFloat(b));
    });
    expr = expr.replace(/([\d.]+)\s*\/\s*([\d.]+)/g, (match, a, b) => {
      return String(parseFloat(a) / parseFloat(b));
    });

    // Addition and subtraction
    expr = expr.replace(/([\d.]+)\s*\+\s*([\d.]+)/g, (match, a, b) => {
      return String(parseFloat(a) + parseFloat(b));
    });
    expr = expr.replace(/([\d.]+)\s*-\s*([\d.]+)/g, (match, a, b) => {
      return String(parseFloat(a) - parseFloat(b));
    });

    const num = parseFloat(expr);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Replace variable references in expression with their values
   */
  replaceVariables(expr) {
    // Match variable names (A-Z followed by A-Z0-9, optionally with $)
    const varPattern = /\b([A-Z][A-Z0-9]*\$?)\b/g;
    return expr.replace(varPattern, (match, varName) => {
      if (this.variables[varName] !== undefined) {
        return String(this.variables[varName]);
      }
      return match; // Keep original if variable not found
    });
  }

  /**
   * Call a BASIC function
   */
  callFunction(funcName, args) {
    switch (funcName) {
      case "SQR":
        return Math.sqrt(args[0] || 0);
      case "INT":
        return Math.floor(args[0] || 0);
      case "ABS":
        return Math.abs(args[0] || 0);
      case "RND":
        return Math.random();
      case "SIN":
        return Math.sin(args[0] || 0);
      case "COS":
        return Math.cos(args[0] || 0);
      case "TAN":
        return Math.tan(args[0] || 0);
      case "ATN":
        return Math.atan(args[0] || 0);
      case "LOG":
        return Math.log(args[0] || 1);
      case "EXP":
        return Math.exp(args[0] || 0);
      case "SGN":
        const val = args[0] || 0;
        return val > 0 ? 1 : val < 0 ? -1 : 0;
      case "LEN":
        return String(args[0] || "").length;
      case "LEFT$":
        const str = String(args[0] || "");
        const len = Math.floor(args[1] || 0);
        return str.substring(0, len);
      case "RIGHT$":
        const str2 = String(args[0] || "");
        const len2 = Math.floor(args[1] || 0);
        return str2.substring(Math.max(0, str2.length - len2));
      case "MID$":
        const str3 = String(args[0] || "");
        const start = Math.floor(args[1] || 1) - 1;
        const len3 = args[2] ? Math.floor(args[2]) : str3.length;
        return str3.substring(start, start + len3);
      case "STR$":
        return String(args[0] || 0);
      case "VAL":
        return parseFloat(args[0] || "0");
      case "ASC":
        const str4 = String(args[0] || "");
        return str4.length > 0 ? str4.charCodeAt(0) : 0;
      case "CHR$":
        return String.fromCharCode(Math.floor(args[0] || 0));
      case "PEEK":
        const addr = Math.floor(args[0] || 0);
        if (this.onPeek) {
          return this.onPeek(addr);
        }
        return 0;
      case "INKEY$":
        // Return keypress if available, otherwise empty string
        if (this.onInkey) {
          return this.onInkey();
        }
        return "";
      case "TAB":
        // TAB function for PRINT - returns spaces
        const tabPos = Math.floor(args[0] || 0);
        return " ".repeat(Math.max(0, tabPos - 1));
      case "POINT":
        // POINT function - returns 1 if pixel is set, 0 if not
        const px = Math.floor(args[0] || 0);
        const py = Math.floor(args[1] || 0);
        if (this.onPointPixel) {
          return this.onPointPixel(px, py) ? 1 : 0;
        }
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Call a user-defined function (DEF FN)
   */
  callUserFunction(funcName, args) {
    if (!this.userFunctions || !this.userFunctions[funcName]) {
      this.logFn(`?UF ERROR`, "error");
      return 0;
    }

    const funcDef = this.userFunctions[funcName];
    const paramValue = args[0] || 0;

    // Temporarily set parameter variable
    const oldValue = this.variables[funcDef.param];
    this.variables[funcDef.param] = paramValue;

    // Evaluate function expression
    const result = this.evaluateExpression(funcDef.expression);

    // Restore parameter variable
    if (oldValue !== undefined) {
      this.variables[funcDef.param] = oldValue;
    } else {
      delete this.variables[funcDef.param];
    }

    return result;
  }

  /**
   * Parse a statement into parts
   */
  parseStatement(line) {
    return line.split(/\s+/).filter((p) => p.length > 0);
  }

  /**
   * Break execution
   */
  break() {
    this.shouldBreak = true;
    this.programRunning = false;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
