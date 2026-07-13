/**
 * Built-in program library.
 *
 * Two entry kinds:
 *   kind "file" — a binary/text program under public/programs/ fetched on
 *   demand: format "cmd" (DOS executable), "cas" (cassette image, BASIC
 *   or SYSTEM — .3bn SYSTEM-block images parse the same way), or "bas"
 *   (ASCII source that gets turbo-typed). Sourced from trsjs.48k.ca or
 *   trs-80.com, or generated locally by scripts/build-cas.js; see the
 *   LICENSE exception about their copyright status.
 *
 *   kind absent (text) — public-domain classics in Level II-safe BASIC
 *   (no ELSE, uppercase, RND(n) integer form), compact adaptations in
 *   the spirit of David Ahl's "BASIC Computer Games" (Ahl released his
 *   books to the public domain). Each entry is plain text that gets
 *   turbo-typed into the real ROM — the machine tokenizes it itself.
 *
 * Each entry's `group` shelves it under one of four library optgroups,
 * and entries below are ordered to match (the UI's optgroup builder
 * appends in encounter order — src/ui/emulator-ui.js): Arcade,
 * Adventures, BASIC type-ins, Extras.
 *
 * `expect` is a string the program prints early, used by the headless
 * library test to prove the program loads and runs.
 */

export const LIBRARY = [
  // ---- Arcade: trsjs.48k.ca originals (see LICENSE exception) ----
  {
    id: "supernova",
    title: "Super Nova (Big Five, 1980)",
    group: "Arcade",
    kind: "file",
    file: "/programs/nova-m3.cmd",
    format: "cmd",
    note: "Press CLEAR (Home key) to start",
  },
  {
    id: "galaxy-invasion",
    title: "Galaxy Invasion (Big Five, 1980)",
    group: "Arcade",
    kind: "file",
    file: "/programs/galaxy.cmd",
    format: "cmd",
  },
  {
    id: "flying-saucers",
    title: "Flying Saucers (1980)",
    group: "Arcade",
    kind: "file",
    file: "/programs/flysauc1.cmd",
    format: "cmd",
  },
  {
    id: "sea-dragon",
    title: "Sea Dragon (Adventure Intl, 1982)",
    group: "Arcade",
    kind: "file",
    file: "/programs/seadrag.3bn",
    format: "cas",
  },
  {
    id: "time-trek",
    title: "Time Trek (1980)",
    group: "Arcade",
    kind: "file",
    file: "/programs/timetrek.3bn",
    format: "cas",
  },
  {
    id: "invasion-force",
    title: "Invasion Force (1979)",
    group: "Arcade",
    kind: "file",
    file: "/programs/invade.cas",
    format: "cas",
  },
  {
    id: "city-defence",
    title: "City Defence (BASIC, ~20 s to type in)",
    group: "Arcade",
    kind: "file",
    file: "/programs/m2.bas",
    format: "bas",
  },
  // ---- Arcade: v1.3.0 additions from trs-80.com (see LICENSE exception) ----
  {
    id: "scarfman",
    title: "Scarfman (Cornsoft, 1981)",
    group: "Arcade",
    kind: "file",
    file: "/programs/scarfman.cas",
    format: "cas",
  },
  {
    id: "cosmic-fighter",
    title: "Cosmic Fighter (Big Five, 1980)",
    group: "Arcade",
    kind: "file",
    file: "/programs/cosmic.cmd",
    format: "cmd",
    note: "Press CLEAR (Home key) to start",
  },
  {
    id: "meteor-mission-2",
    title: "Meteor Mission 2 (Big Five, 1981)",
    group: "Arcade",
    kind: "file",
    file: "/programs/meteor2.cmd",
    format: "cmd",
  },
  {
    id: "defense-command",
    title: "Defense Command (Big Five, 1982)",
    group: "Arcade",
    kind: "file",
    file: "/programs/defense.cas",
    format: "cas",
    note: "Press 1 or 2 to select players and start",
  },
  {
    id: "armored-patrol",
    title: "Armored Patrol (Adventure Intl, 1981)",
    group: "Arcade",
    kind: "file",
    file: "/programs/armored.cmd",
    format: "cmd",
    note: "Press 1 or 2 to select players and start",
  },
  // ---- Adventures: v1.3.0 additions from trs-80.com (see LICENSE exception) ----
  {
    id: "adventureland",
    title: "Adventureland (Scott Adams, 1978)",
    group: "Adventures",
    kind: "file",
    file: "/programs/advland.cmd",
    format: "cmd",
    note: 'Decline "restore a saved game?", then Enter past the intro to start',
  },
  {
    id: "pirate-adventure",
    title: "Pirate Adventure (Scott Adams, 1979)",
    group: "Adventures",
    kind: "file",
    file: "/programs/pirate.cmd",
    format: "cmd",
    note: 'Decline "restore a saved game?", then Enter past the intro to start',
  },
  {
    id: "bedlam",
    title: "Bedlam (Tandy, 1982)",
    group: "Adventures",
    kind: "file",
    file: "/programs/bedlam.cmd",
    format: "cmd",
  },
  // ---- BASIC type-ins: public-domain classics (MIT-covered) ----
  {
    id: "hammurabi",
    title: "Hammurabi (city-state sim)",
    group: "BASIC type-ins",
    expect: "HAMURABI",
    text: `10 PRINT "HAMURABI - RULE ANCIENT SUMERIA"
20 P=100: S=2800: L=1000: Y=3: D=0: I=5
30 FOR Z=1 TO 10
40 PRINT: PRINT "YEAR";Z;": POP";P;" ACRES";L;" BUSHELS";S
50 IF D>0 THEN PRINT D;"PEOPLE STARVED LAST YEAR"
60 C=17+RND(6): PRINT "LAND TRADES AT";C;"BUSHELS/ACRE"
70 INPUT "ACRES TO BUY (0=NONE OR SELL)";A
80 IF A*C>S THEN PRINT "ONLY";S;"BUSHELS!": GOTO 70
90 IF A<0 THEN IF -A>L THEN PRINT "ONLY";L;"ACRES!": GOTO 70
100 L=L+A: S=S-A*C
110 INPUT "BUSHELS TO FEED PEOPLE";F
120 IF F>S THEN PRINT "ONLY";S;"BUSHELS!": GOTO 110
130 S=S-F
140 INPUT "ACRES TO PLANT";Q
150 IF Q>L THEN PRINT "ONLY";L;"ACRES!": GOTO 140
160 IF Q/2>S THEN PRINT "NOT ENOUGH SEED!": GOTO 140
170 S=S-INT(Q/2)
180 Y=RND(5): H=Q*Y: S=S+H
190 R=0: IF RND(100)<16 THEN R=INT(S/2): S=S-R
200 IF R>0 THEN PRINT "RATS ATE";R;"BUSHELS!"
210 PRINT "HARVEST:";H;"BUSHELS (";Y;"PER ACRE)"
220 D=P-INT(F/20): IF D<0 THEN D=0
230 IF D>0 THEN P=P-D
240 IF D>INT(P/2) THEN PRINT "YOU STARVED HALF THE CITY! IMPEACHED!": GOTO 290
250 N=RND(5): P=P+N
260 PRINT N;"CAME TO THE CITY"
270 IF P<1 THEN PRINT "EVERYONE IS DEAD. GAME OVER.": GOTO 300
280 NEXT Z: PRINT "TEN YEARS OF RULE COMPLETE!"
290 PRINT "FINAL: POP";P;" ACRES";L;" BUSHELS";S
300 PRINT "SO ENDS YOUR REIGN."
`,
  },
  {
    id: "lunar",
    title: "Lunar Lander",
    group: "BASIC type-ins",
    expect: "LUNAR",
    text: `10 PRINT "LUNAR LANDER"
20 PRINT "LAND SOFTLY: SPEED UNDER 5 M/S"
30 A=120: V=40: F=60: T=0
40 PRINT "TIME";T;" ALT";INT(A);" SPEED";INT(V);" FUEL";INT(F)
50 IF A<=0 THEN GOTO 120
60 INPUT "BURN (0-5)";B
70 IF B<0 THEN B=0
80 IF B>5 THEN B=5
90 IF B>F THEN B=F
100 F=F-B: V=V+5-B*2: A=A-V: T=T+1
110 GOTO 40
120 IF V<5 THEN PRINT "TOUCHDOWN! THE EAGLE HAS LANDED.": GOTO 140
130 PRINT "CRASHED AT";INT(V);"M/S. NEW CRATER MADE."
140 PRINT "MISSION TIME:";T
`,
  },
  {
    id: "hurkle",
    title: "Hurkle (grid hunt)",
    group: "BASIC type-ins",
    expect: "HURKLE",
    text: `10 PRINT "FIND THE HURKLE ON A 10X10 GRID"
20 X=RND(10)-1: Y=RND(10)-1
30 FOR T=1 TO 6
40 PRINT "GUESS";T;
50 INPUT " X,Y (0-9)";A,B
60 IF A=X THEN IF B=Y THEN PRINT "YOU FOUND THE HURKLE!!": GOTO 150
70 PRINT "GO ";
80 IF B<Y THEN PRINT "NORTH ";
90 IF B>Y THEN PRINT "SOUTH ";
100 IF A<X THEN PRINT "EAST";
110 IF A>X THEN PRINT "WEST";
120 PRINT
130 NEXT T
140 PRINT "THE HURKLE WAS AT";X;",";Y
150 PRINT "DONE"
`,
  },
  {
    id: "guess",
    title: "Number Guess",
    group: "BASIC type-ins",
    expect: "GUESS",
    text: `10 PRINT "GUESS MY NUMBER (1-100)"
20 N=RND(100): G=0
30 INPUT "YOUR GUESS";A: G=G+1
40 IF A<N THEN PRINT "TOO LOW": GOTO 30
50 IF A>N THEN PRINT "TOO HIGH": GOTO 30
60 PRINT "GOT IT IN";G;"TRIES!"
`,
  },
  // ---- BASIC type-ins: v1.3.0 additions ----
  {
    id: "wumpus",
    title: "Hunt the Wumpus (cave hunt)",
    group: "BASIC type-ins",
    expect: "WUMPUS",
    text: `10 PRINT "HUNT THE WUMPUS - 20 CAVES, 5 ARROWS"
20 DIM R(20,3)
30 FOR I=1 TO 20: FOR J=1 TO 3: READ R(I,J): NEXT J: NEXT I
40 DATA 2,5,8,1,3,10,2,4,12,3,5,14,1,4,6
50 DATA 5,7,15,6,8,17,1,7,9,8,10,18,2,9,11
60 DATA 10,12,19,3,11,13,12,14,20,4,13,15,6,14,16
70 DATA 15,17,20,7,16,18,9,17,19,11,18,20,13,16,19
80 P=RND(20)
90 W=RND(20): IF W=P THEN 90
100 A=RND(20): IF A=P THEN 100
110 IF A=W THEN 100
120 B=RND(20): IF B=P THEN 120
130 IF B=W THEN 120
140 IF B=A THEN 120
150 M=5
160 PRINT: PRINT "YOU ARE IN CAVE";P
170 PRINT "TUNNELS LEAD TO";R(P,1);R(P,2);R(P,3)
180 FOR J=1 TO 3
190 IF R(P,J)=W THEN PRINT "I SMELL A WUMPUS!"
200 IF R(P,J)=A THEN PRINT "I FEEL A DRAFT!"
210 IF R(P,J)=B THEN PRINT "BATS NEARBY!"
220 NEXT J
230 INPUT "1=MOVE 2=SHOOT";C
240 IF C=2 THEN 380
250 INPUT "WHERE TO";N
260 F=0: IF N=R(P,1) THEN F=1
270 IF N=R(P,2) THEN F=1
280 IF N=R(P,3) THEN F=1
290 IF F=0 THEN PRINT "NO TUNNEL THERE!": GOTO 250
300 P=N
310 IF P=W THEN PRINT "THE WUMPUS GOT YOU! YOU LOSE.": GOTO 440
320 IF P=A THEN PRINT "YYIIEEE! YOU FELL IN A PIT!": GOTO 440
330 IF P=B THEN PRINT "GIANT BATS CARRY YOU OFF!": P=RND(20): GOTO 310
340 GOTO 160
380 INPUT "SHOOT INTO WHICH CAVE";N
390 M=M-1
400 IF N=W THEN PRINT "AHA! YOU SLEW THE WUMPUS! YOU WIN!": GOTO 440
410 PRINT "YOUR ARROW CLATTERS AWAY..."
415 IF RND(4)>1 THEN W=R(W,RND(3)): IF W=P THEN PRINT "IT FOUND YOU! YOU LOSE.": GOTO 440
420 IF M=0 THEN PRINT "OUT OF ARROWS. THE WUMPUS WINS.": GOTO 440
430 GOTO 160
440 PRINT "GAME OVER"
`,
  },
  {
    id: "acey-ducey",
    title: "Acey Ducey (card bets)",
    group: "BASIC type-ins",
    expect: "ACEY",
    text: `10 PRINT "ACEY DUCEY - BET THE NEXT CARD FALLS BETWEEN"
20 Q=100
30 PRINT: PRINT "YOU HAVE $";Q
40 A=RND(13): B=RND(13)
50 IF A=B THEN 40
60 IF A>B THEN T=A: A=B: B=T
70 PRINT "FIRST CARD:";A;"  SECOND CARD:";B
80 INPUT "YOUR BET (0 TO PASS)";W
90 IF W=0 THEN PRINT "CHICKEN!": GOTO 30
100 IF W>Q THEN PRINT "YOU ONLY HAVE $";Q: GOTO 80
110 IF W<0 THEN 80
120 C=RND(13)
130 PRINT "NEXT CARD:";C
140 IF C>A THEN IF C<B THEN PRINT "YOU WIN!": Q=Q+W: GOTO 170
150 PRINT "YOU LOSE!"
160 Q=Q-W
170 IF Q<1 THEN PRINT "BUSTED. GAME OVER.": GOTO 190
180 GOTO 30
190 PRINT "SO LONG."
`,
  },
  {
    id: "bagels",
    title: "Bagels (digit deduction)",
    group: "BASIC type-ins",
    expect: "BAGELS",
    text: `10 PRINT "BAGELS - GUESS MY 3-DIGIT NUMBER (ALL DIGITS DIFFER)"
20 PRINT "CLUES: FERMI=RIGHT PLACE  PICO=WRONG PLACE  BAGELS=NONE"
30 A=RND(10)-1
40 B=RND(10)-1: IF B=A THEN 40
50 C=RND(10)-1: IF C=A THEN 50
60 IF C=B THEN 50
70 FOR T=1 TO 20
80 INPUT "GUESS (E.G. 123)";G
90 IF G<0 THEN 80
100 IF G>999 THEN 80
110 X=INT(G/100): Y=INT(G/10)-X*10: Z=G-INT(G/10)*10
120 F=0: P=0
130 IF X=A THEN F=F+1
140 IF Y=B THEN F=F+1
150 IF Z=C THEN F=F+1
160 IF X=B THEN P=P+1
170 IF X=C THEN P=P+1
180 IF Y=A THEN P=P+1
190 IF Y=C THEN P=P+1
200 IF Z=A THEN P=P+1
210 IF Z=B THEN P=P+1
220 IF F=3 THEN PRINT "YOU GOT IT IN";T;"GUESSES!": GOTO 290
230 IF F=0 THEN IF P=0 THEN PRINT "BAGELS": GOTO 270
240 IF F>0 THEN FOR I=1 TO F: PRINT "FERMI ";: NEXT I
250 IF P>0 THEN FOR I=1 TO P: PRINT "PICO ";: NEXT I
260 PRINT
270 NEXT T
280 PRINT "OUT OF GUESSES. IT WAS";A*100+B*10+C
290 PRINT "DONE"
`,
  },
  {
    id: "camel",
    title: "Camel (desert trek)",
    group: "BASIC type-ins",
    expect: "CAMEL",
    text: `10 PRINT "CAMEL - CROSS THE 200-MILE GOBI DESERT"
20 PRINT "THE PYGMIES ARE 25 MILES BEHIND YOU"
30 D=0: E=-25: W=6: C=6
40 PRINT: PRINT "MILES DONE:";D;" PYGMIES";D-E;"BACK  WATER:";W
50 PRINT "1=MODERATE PACE 2=FULL GALLOP 3=DRINK 4=REST"
60 INPUT "COMMAND";A
70 IF A=1 THEN M=RND(10)+4: D=D+M: C=C-1: PRINT "YOU TRAVEL";M;"MILES"
80 IF A=2 THEN M=RND(20)+9: D=D+M: C=C-3: PRINT "GALLOP!";M;"MILES"
90 IF A=3 THEN IF W=0 THEN PRINT "NO WATER LEFT!"
100 IF A=3 THEN IF W>0 THEN W=W-1: C=6: PRINT "AAHH. REFRESHING."
110 IF A=4 THEN C=6: PRINT "THE CAMEL RESTS."
120 IF A<3 THEN IF RND(20)=1 THEN PRINT "SANDSTORM! YOU LOSE 10 MILES": D=D-10
130 E=E+RND(18)+1
140 IF C<1 THEN PRINT "YOUR CAMEL COLLAPSES. THE PYGMIES GET YOU.": GOTO 200
150 IF E>=D THEN PRINT "THE PYGMIES CAUGHT YOU! CAPTURED!": GOTO 200
160 IF D>=200 THEN PRINT "YOU MADE IT ACROSS THE DESERT! HOORAY!": GOTO 200
170 IF RND(25)=1 THEN PRINT "AN OASIS! WATER REFILLED.": W=6
180 GOTO 40
200 PRINT "GAME OVER"
`,
  },
  {
    id: "hangman",
    title: "Hangman (word guess)",
    group: "BASIC type-ins",
    expect: "HANGMAN",
    text: `10 PRINT "HANGMAN"
20 CLEAR 200
30 W=RND(10)
40 FOR I=1 TO W: READ W$: NEXT I
50 DATA COMPUTER,TANDY,CASSETTE,MONITOR,KEYBOARD
60 DATA PROGRAM,MEMORY,SCREEN,DISKETTE,PHOSPHOR
70 L=LEN(W$): G$="": M=6
80 PRINT "THE WORD HAS";L;"LETTERS.  MISSES LEFT:";M
90 D$=""
100 FOR I=1 TO L
110 C$=MID$(W$,I,1)
120 F=0
130 FOR J=1 TO LEN(G$): IF MID$(G$,J,1)=C$ THEN F=1
140 NEXT J
150 IF F=1 THEN D$=D$+C$
160 IF F=0 THEN D$=D$+"-"
170 NEXT I
180 PRINT "WORD: ";D$
190 IF D$=W$ THEN PRINT "YOU SAVED HIM! IT WAS ";W$: GOTO 290
200 IF M=0 THEN PRINT "HANGED! THE WORD WAS ";W$: GOTO 290
210 INPUT "YOUR LETTER";A$
220 A$=LEFT$(A$,1)
230 G$=G$+A$
240 F=0
250 FOR I=1 TO L: IF MID$(W$,I,1)=A$ THEN F=1
260 NEXT I
270 IF F=0 THEN M=M-1: PRINT "NO ";A$;" IN IT!"
280 GOTO 80
290 PRINT "GAME OVER"
`,
  },
  // ---- Extras: big BASIC and curiosities (see LICENSE exception) ----
  {
    id: "opus1",
    title: "OPUS-1 (cassette music — silent: no sound yet)",
    group: "Extras",
    kind: "file",
    file: "/programs/opus1msg.cmd",
    format: "cmd",
  },
  {
    id: "super-star-trek",
    title: "Super Star Trek (Ahl, 1978 — public domain)",
    group: "Extras",
    kind: "file",
    file: "/programs/sstrek.cas",
    format: "cas",
    note: "Galaxy setup takes about a minute at 2 MHz - hold the ` key (or click TURBO) to skip through it",
  },
];
