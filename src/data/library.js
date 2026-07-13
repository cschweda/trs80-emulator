/**
 * Built-in program library.
 *
 * Two entry kinds:
 *   kind "file" — a binary/text program under public/programs/ fetched on
 *   demand: format "cmd" (DOS executable), "cas" (cassette image, BASIC
 *   or SYSTEM — .3bn SYSTEM-block images parse the same way), or "bas"
 *   (ASCII source that gets turbo-typed). These are the trsjs.48k.ca
 *   games; see the LICENSE exception about their copyright status.
 *
 *   kind absent (text) — public-domain classics in Level II-safe BASIC
 *   (no ELSE, uppercase, RND(n) integer form), compact adaptations in
 *   the spirit of David Ahl's "BASIC Computer Games" (Ahl released his
 *   books to the public domain). Each entry is plain text that gets
 *   turbo-typed into the real ROM — the machine tokenizes it itself.
 *
 * `expect` is a string the program prints early, used by the headless
 * library test to prove the program loads and runs.
 */

export const LIBRARY = [
  // ---- Games from trsjs.48k.ca (see LICENSE exception) ----
  {
    id: "supernova",
    title: "Super Nova (Big Five, 1980)",
    group: "Games",
    kind: "file",
    file: "/programs/nova-m3.cmd",
    format: "cmd",
    note: "Press CLEAR (Home key) to start",
  },
  {
    id: "galaxy-invasion",
    title: "Galaxy Invasion (Big Five, 1980)",
    group: "Games",
    kind: "file",
    file: "/programs/galaxy.cmd",
    format: "cmd",
  },
  {
    id: "flying-saucers",
    title: "Flying Saucers (1980)",
    group: "Games",
    kind: "file",
    file: "/programs/flysauc1.cmd",
    format: "cmd",
  },
  {
    id: "sea-dragon",
    title: "Sea Dragon (Adventure Intl, 1982)",
    group: "Games",
    kind: "file",
    file: "/programs/seadrag.3bn",
    format: "cas",
  },
  {
    id: "time-trek",
    title: "Time Trek (1980)",
    group: "Games",
    kind: "file",
    file: "/programs/timetrek.3bn",
    format: "cas",
  },
  {
    id: "invasion-force",
    title: "Invasion Force (1979)",
    group: "Games",
    kind: "file",
    file: "/programs/invade.cas",
    format: "cas",
  },
  {
    id: "city-defence",
    title: "City Defence (BASIC, ~20 s to type in)",
    group: "Games",
    kind: "file",
    file: "/programs/m2.bas",
    format: "bas",
  },
  {
    id: "opus1",
    title: "OPUS-1 (cassette music — silent: no sound yet)",
    group: "Games",
    kind: "file",
    file: "/programs/opus1msg.cmd",
    format: "cmd",
  },
  // ---- v1.3.0 arcade classics (see LICENSE exception) ----
  {
    id: "scarfman",
    title: "Scarfman (Cornsoft, 1981)",
    group: "Arcade",
    kind: "file",
    file: "/programs/scarfman.cas",
    format: "cas",
  },
  {
    id: "robot-attack",
    title: "Robot Attack (Big Five, 1981)",
    group: "Arcade",
    kind: "file",
    file: "/programs/robotatk.cas",
    format: "cas",
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
    title: "Armored Patrol (Adventure International, 1981)",
    group: "Arcade",
    kind: "file",
    file: "/programs/armored.cmd",
    format: "cmd",
    note: "Press 1 or 2 to select players and start",
  },
  {
    id: "hammurabi",
    title: "Hammurabi (city-state sim)",
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
    expect: "GUESS",
    text: `10 PRINT "GUESS MY NUMBER (1-100)"
20 N=RND(100): G=0
30 INPUT "YOUR GUESS";A: G=G+1
40 IF A<N THEN PRINT "TOO LOW": GOTO 30
50 IF A>N THEN PRINT "TOO HIGH": GOTO 30
60 PRINT "GOT IT IN";G;"TRIES!"
`,
  },
];
