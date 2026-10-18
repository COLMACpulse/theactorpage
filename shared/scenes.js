/* TODAY'S SCENE: the library.
   Original two-handers, written for this site. Any actor can play either part:
   names aren't tied to gender, and the want is under the lines, never said.
   Each scene is tagged with what it trains. "you" is the part offered first.
   Format: plain sides. Heading, action, NAME on its own line, the speech under it. */
(function(g){
const SCENES=[
{id:'spare-key', title:'Spare Key', trains:'secret', tags:['secret','relationship','listening'], you:'CASEY',
 setup:'The day after the funeral. You came to give back a key. You owe the dead money, and your sibling is about to find out.',
 text:`INT. KITCHEN - MORNING

Casseroles nobody will eat. JORDAN is labeling them. CASEY stands in the doorway holding a single key on a ring.

CASEY
I brought the spare back.

JORDAN
Mom gave you a spare?

CASEY
Years ago. For emergencies.

JORDAN
She never gave me one.

CASEY
You lived ten minutes away. You were the emergency.

JORDAN
Put it in the drawer. With the rubber bands.

CASEY
(not moving)
Did you go through her desk yet?

JORDAN
Some of it. Why?

CASEY
No reason. She kept everything. I just figured it was a lot.

JORDAN
There's a notebook. Names and numbers. Like a little bank.

CASEY
Huh.

JORDAN
Your name's in it. Four times.

CASEY
She liked to keep track of birthdays.

JORDAN
Next to dollar signs, Casey.

CASEY
(sets the key down)
I was going to pay it back.

JORDAN
I know. That's what's written at the bottom. In her handwriting. "Casey will pay it back."

CASEY
Then I guess she believed me.

JORDAN
She did. That's what I can't get past.`},

{id:'exit-interview', title:'Exit Interview', trains:'status', tags:['status','tactic','reversal'], you:'MORGAN',
 setup:'Your last day. HR wants a friendly form filled out. You have a folder that could sink the company.',
 text:`INT. SMALL CONFERENCE ROOM - DAY

A box of tissues nobody needs. AVERY has a clipboard. MORGAN has a manila folder, closed.

AVERY
This is just a formality. Ten minutes. Then cake.

MORGAN
There's cake?

AVERY
There's always cake.

MORGAN
There wasn't cake for Dale.

AVERY
Dale's situation was different.

MORGAN
Dale's situation was that he asked where the overtime went.

AVERY
(a smile that costs effort)
Question one. Would you recommend us as a place to work?

MORGAN
To who?

AVERY
To anyone.

MORGAN
I'd recommend it to a lawyer.

AVERY
Morgan.

MORGAN
Question two.

AVERY
What's in the folder?

MORGAN
Is that question two?

AVERY
It's my question.

MORGAN
Timesheets. Mine. Dale's. Eleven other people who didn't get cake.

AVERY
You signed an agreement.

MORGAN
I signed it Monday. I made copies Friday.

AVERY
(sets the clipboard down)
What do you want?

MORGAN
I want you to finish the form. Out loud. Every question. And I want you to write down exactly what I say.`},

{id:'the-couch', title:'The Couch', trains:'comedy', tags:['comedy','tactic','relationship'], you:'QUINN',
 setup:'Moving day. Roommates of six years. One couch. Neither of you paid for it, and both of you want it.',
 text:`INT. EMPTY APARTMENT - DAY

Boxes everywhere. One ugly green couch in the middle. QUINN sits on it. DREW stands over it with a roll of tape.

DREW
You can't just sit on it.

QUINN
I can sit on a couch. That's the whole design.

DREW
Possession is not ownership.

QUINN
Possession is nine tenths.

DREW
Of what?

QUINN
I don't know. Of the couch.

DREW
My cousin gave us that couch.

QUINN
Your cousin gave us that couch because it smelled like a ferret.

DREW
And who got the smell out?

QUINN
Time. Time got the smell out.

DREW
I steamed it. Twice.

QUINN
(lies down)
Then you should have steamed it a third time and taken it to your room.

DREW
Okay. Rock paper scissors.

QUINN
Best of one.

DREW
Best of three.

QUINN
Best of one or I'm sleeping here.

DREW
(holds up a fist)
Fine. On three.

QUINN
(doesn't move)
I'm not playing. I just wanted to see you agree to best of one.

DREW
I hate living with you.

QUINN
You have about four hours left. Make them count.`},

{id:'night-shift', title:'Night Shift', trains:'listening', tags:['listening','silence','circumstance'], you:'REESE',
 setup:'Three in the morning on a hospital floor. Visiting hours ended at nine. Someone is still sitting in the hallway, and it\'s your job to send them home.',
 text:`INT. HOSPITAL HALLWAY - NIGHT

Vending machine hum. ELLIS sits in a plastic chair with a coat on, ready to leave, not leaving. REESE, in scrubs, stops.

REESE
Visiting hours ended at nine.

ELLIS
I know.

REESE
I could get you a cab.

ELLIS
I drove.

REESE
Then you could drive.

ELLIS
I could.

REESE
(sits two chairs away)
He's sleeping. That's good. Sleep is the best thing for him right now.

ELLIS
He talks in his sleep. Did you know that?

REESE
Some of them do.

ELLIS
He said a name. Not mine.

REESE
People say all kinds of things. The medication...

ELLIS
It was my brother's name.

REESE
(beat)
Okay.

ELLIS
They haven't spoken in twenty years.

REESE
Is your brother someone we should call?

ELLIS
I don't have his number. I was the reason they stopped talking.

REESE
(after a moment)
The cafeteria opens at five. The coffee's terrible. I'll walk you down.

ELLIS
You're supposed to send me home.

REESE
I'm supposed to do a lot of things.`},

{id:'second-opinion', title:'Second Opinion', trains:'tactic', tags:['tactic','status','comedy'], you:'BLAKE',
 setup:'Your car needs a repair you can\'t afford. The mechanic is honest, which is the problem. You try everything.',
 text:`INT. GARAGE OFFICE - DAY

Calendars from parts suppliers. SAGE wipes hands on a rag. BLAKE holds a written estimate like it might bite.

BLAKE
Eighteen hundred.

SAGE
Eighteen forty with the belt.

BLAKE
Is the belt optional?

SAGE
Everything's optional. Driving's optional.

BLAKE
The other place said four hundred.

SAGE
The other place said you need wipers.

BLAKE
They were very thorough about the wipers.

SAGE
Your transmission is held together by habit.

BLAKE
(trying warmth)
You have a kind face. Has anyone told you that?

SAGE
Eighteen forty.

BLAKE
What if I paid in cash?

SAGE
Then it's eighteen forty in cash.

BLAKE
What if I paid half now and the rest in, like, gratitude?

SAGE
Gratitude doesn't buy fluid.

BLAKE
(the truth comes out)
I have a job interview Thursday. Forty miles out. If I don't get there I don't get the job, and if I don't get the job I can't pay you anyway.

SAGE
(long look)
There's a loaner. It's ugly.

BLAKE
How ugly?

SAGE
It's purple. And the radio only gets one station.

BLAKE
What station?

SAGE
Polka.

BLAKE
I'll take it.`},

{id:'callback', title:'Callback', trains:'status', tags:['status','comedy','secret'], you:'PARKER',
 setup:'A waiting room. You and one other actor are the last two for the same part. Only one of you knows the director already decided.',
 text:`INT. CASTING WAITING ROOM - DAY

Two chairs. Two water bottles. PARKER runs lines under their breath. TAYLOR scrolls a phone, too relaxed.

TAYLOR
You're doing the scene with the phone call?

PARKER
Everyone's doing the scene with the phone call.

TAYLOR
I mean, are you doing it on the phone? Or are you miming it?

PARKER
I'm going to mime a phone. Like a person.

TAYLOR
Bold.

PARKER
What are you doing?

TAYLOR
I brought a phone.

PARKER
A real phone.

TAYLOR
It's my phone. I'm not going to buy a prop phone.

PARKER
(beat)
You seem very calm.

TAYLOR
I meditated.

PARKER
For a callback.

TAYLOR
For life. The callback's just where I am.

PARKER
They said they were "between two people."

TAYLOR
They say that.

PARKER
You know something.

TAYLOR
I don't know anything.

PARKER
You know the director.

TAYLOR
(puts the phone away)
We went to the same school. Different years. It doesn't mean anything.

PARKER
Then why'd you put the phone away?

TAYLOR
Because they're about to call one of us. And I want you to have a good one. I mean that.`},

{id:'dead-air', title:'Dead Air', trains:'silence', tags:['silence','listening','circumstance'], you:'NOEL',
 setup:'A late-night call-in radio show. A caller who won\'t say why they called. You have forty seconds before the break and you can\'t hang up on them.',
 text:`INT. RADIO BOOTH - NIGHT

Red ON AIR light. NOEL at the mic, headphones on. The caller, ROWAN, is on the line. We hear both.

NOEL
You're on the air. Go ahead.

ROWAN
Hi. Sorry. I didn't think I'd get through.

NOEL
Well, you did. What's on your mind tonight?

ROWAN
I don't really know.

NOEL
That's all right. Most people don't. Where are you calling from?

ROWAN
A parking lot.

NOEL
Nice night for it?

ROWAN
I've been here a while.

NOEL
(glances at the clock)
We've got about forty seconds before a break. Anything you want to say before then?

ROWAN
You played a song earlier. The one about the porch.

NOEL
I did.

ROWAN
My dad used to sing that. Badly.

NOEL
That's the right way to sing it.

A long pause on the line. Just the hum of a car engine.

NOEL
Still with me?

ROWAN
Yeah.

NOEL
I'm going to skip the break.

ROWAN
You can do that?

NOEL
Nobody's listening to the ads at this hour. Tell me about the porch.`},

{id:'cellmates', title:'Cellmates', trains:'relationship', tags:['relationship','secret','listening'], you:'HAYDEN',
 setup:'Twelve years after you shared a cell. A diner booth. You came to say thank you. The other one came to collect.',
 text:`INT. DINER BOOTH - DAY

Two coffees. HAYDEN in a pressed shirt, a wedding ring. LANE in a jacket that has seen better years.

HAYDEN
You look good.

LANE
You look expensive.

HAYDEN
It's a shirt.

LANE
It's a nice shirt.

HAYDEN
I wanted to say it in person. I wouldn't have made it out of there without you.

LANE
You'd have made it.

HAYDEN
Not in one piece.

LANE
(stirs the coffee, doesn't drink)
You married?

HAYDEN
Six years. Two kids.

LANE
Do they know?

HAYDEN
My wife knows.

LANE
The kids?

HAYDEN
They're seven and four.

LANE
So no.

HAYDEN
Not yet.

LANE
That's a nice thing to have. A not yet.

HAYDEN
Lane. What do you need?

LANE
Who says I need something?

HAYDEN
You called me. After twelve years.

LANE
(finally drinks)
I need a reference. For a job. Somebody who knew me inside, who'll say I'm all right.

HAYDEN
(a long moment)
Under my name.

LANE
That's the only name I've got for you.`},

{id:'the-gate', title:'The Gate', trains:'circumstance', tags:['circumstance','relationship','silence'], you:'FRANKIE',
 setup:'Dawn at the last gate on a ranch you\'ve both worked for years. One of you has a packed truck. The cattle won\'t wait.',
 text:`EXT. RANCH GATE - DAWN

Cold. Breath in the air. FRANKIE leans on the gate. DANA's truck idles behind them, bed loaded with a saddle and two duffels.

DANA
Gate's sticking again.

FRANKIE
Been sticking since spring.

DANA
You were going to fix it.

FRANKIE
I was going to do a lot of things.

DANA
North pasture needs moving by noon.

FRANKIE
I know what the north pasture needs.

DANA
I'm just saying it.

FRANKIE
You don't have to say it. You're leaving. It's not yours to say anymore.

DANA
(beat)
Boss offered me a raise to stay.

FRANKIE
Didn't offer me one.

DANA
You never said you were going anywhere.

FRANKIE
Where would I go?

DANA
Anywhere. That's the point of going.

FRANKIE
(lifts the gate, shoulders it open)
There. It's open.

DANA
Frankie.

FRANKIE
Truck's running. Gas isn't free.

DANA
Come with me.

FRANKIE
(looks at the pasture, not at Dana)
Somebody's got to move the north pasture by noon.`},

{id:'wrong-table', title:'Wrong Table', trains:'comedy', tags:['comedy','secret','tactic'], you:'ROBIN',
 setup:'A blind date. You sat down at the wrong table about ten minutes ago, and it\'s going better than any date you\'ve had in years.',
 text:`INT. RESTAURANT - NIGHT

Candles. ROBIN and SHAY across a small table, menus down, both laughing at something.

SHAY
No, you're right, nobody actually likes fennel.

ROBIN
It's licorice pretending to be a vegetable.

SHAY
I'm so glad. My cousin said you were "intense."

ROBIN
Your cousin.

SHAY
Dev. Who set this up.

ROBIN
(beat)
Right. Dev.

SHAY
Dev said you did something with boats.

ROBIN
I do a lot with boats.

SHAY
Like what?

ROBIN
Look at them. Mostly.

SHAY
(laughing)
Okay, that's a joke.

ROBIN
Mostly a joke.

SHAY
You're not what I expected.

ROBIN
What did you expect?

SHAY
Dev said you'd show me pictures of your sailboat within five minutes.

ROBIN
(glances across the room at a person waving at an empty table)
I should tell you something.

SHAY
Uh oh.

ROBIN
I don't have a sailboat.

SHAY
That's fine.

ROBIN
I also don't know Dev.

SHAY
(slowly)
How long were you going to let this go?

ROBIN
Honestly? Through dessert.`},

{id:'the-witness', title:'The Witness', trains:'objective', tags:['objective','listening','secret'], you:'CAMERON',
 setup:'A detective and a witness in a back office. The witness saw everything and is protecting a kid. You need the truth before the kid\'s lawyer shows up.',
 text:`INT. BACK OFFICE OF A CORNER STORE - NIGHT

Boxes of chips. A space heater. CAMERON, a detective, sits on a crate. JAMIE, the store owner, stays behind the desk.

CAMERON
How long have you had the store?

JAMIE
Nineteen years.

CAMERON
Long time.

JAMIE
Long enough to know you didn't come to ask about the store.

CAMERON
Camera over the register's been broken since when?

JAMIE
A while.

CAMERON
The repair guy says you called him Tuesday. Said it was working fine.

JAMIE
Then it broke Wednesday.

CAMERON
The night of.

JAMIE
Things break.

CAMERON
(leans forward)
Kid who comes in after school. Buys the orange soda. Counts out the change in nickels.

JAMIE
Lot of kids buy soda.

CAMERON
You give him an extra bag of chips. Every day. Three years.

JAMIE
(quiet)
Who told you that?

CAMERON
His mother. She said you're the only one who ever looked out for him.

JAMIE
Then you know I'm not going to help you.

CAMERON
I'm not here for him. I'm here for the one who handed him the gun.

JAMIE
(a long beat)
You promise me that.

CAMERON
I can promise you I'll ask you once more before his lawyer gets here. After that it's not my promise to make.`},

{id:'the-ask', title:'The Ask', trains:'tactic', tags:['tactic','status','reversal'], you:'EMERY',
 setup:'You raise money for a youth shelter. The donor across the desk has written big checks before. Today they want something for it.',
 text:`INT. CORNER OFFICE - DAY

A view. EMERY holds a folder of photographs. MARLOWE sits behind a desk with nothing on it.

EMERY
Thank you for seeing me.

MARLOWE
You have twelve minutes. My assistant is very strict.

EMERY
I brought pictures of the new rooms. The ones your gift built last year.

MARLOWE
I've seen pictures of rooms.

EMERY
Then I'll skip to the number.

MARLOWE
Please.

EMERY
Two hundred thousand. For the job program.

MARLOWE
That's double.

EMERY
The program's double. Forty kids, not twenty.

MARLOWE
(swivels toward the window)
My nephew needs community service hours. A judge would like to see them by spring.

EMERY
We have a volunteer list.

MARLOWE
I'd like him to be more than a volunteer. A title. Something for a letter.

EMERY
We don't give titles for checks.

MARLOWE
Then this is a very short meeting.

EMERY
(closes the folder)
Your nephew can come Tuesday. He'll serve dinner. If he shows up three weeks straight, I'll write the letter myself, and it'll be true.

MARLOWE
And the two hundred?

EMERY
That's yours to decide. The letter's mine.`},

{id:'inventory', title:'Inventory', trains:'silence', tags:['silence','relationship','circumstance'], you:'KIT',
 setup:'A hardware store\'s last night before it closes for good. Owner and the clerk who has worked there for thirty years, counting what\'s left.',
 text:`INT. HARDWARE STORE - NIGHT

Half-empty shelves. KIT on a stepladder with a clipboard. NOEL counts a bin of loose screws.

KIT
Wood screws, inch and a quarter.

NOEL
Two hundred and six.

KIT
You counted every one?

NOEL
You said count.

KIT
I meant roughly.

NOEL
You've never once meant roughly.

KIT
(writes it down)
Hinges.

NOEL
Eleven.

KIT
We used to sell eleven hinges before lunch.

NOEL
We used to sell a lot of things.

KIT
(climbs down slowly)
The bank man said I should have sold the building ten years ago.

NOEL
The bank man doesn't fix his own sink.

KIT
(a small laugh)
No.

NOEL
(holds up a key on a red tag)
Do you want the key back? To the back door.

KIT
Keep it.

NOEL
There won't be a door.

KIT
Keep it anyway.

NOEL
(puts it in a pocket)
Hinges. Eleven.

KIT
You said.

NOEL
I know. I just wanted to say it again.`},

{id:'ghosted', title:'Ghosted', trains:'relationship', tags:['relationship','objective','listening'], you:'AVERY',
 setup:'Five months ago you stopped answering texts. Tonight you\'re at their door with a reason you haven\'t practiced.',
 text:`INT. APARTMENT DOORWAY - NIGHT

The door open six inches, chain on. TAYLOR on the inside. AVERY in the hall, holding a takeout bag.

TAYLOR
No.

AVERY
I brought dumplings.

TAYLOR
Still no.

AVERY
The good place. With the line.

TAYLOR
Five months, Avery.

AVERY
I know.

TAYLOR
I thought you were dead. I called hospitals. I called your mother.

AVERY
She told me.

TAYLOR
She told you. So she knew where you were.

AVERY
She knew.

TAYLOR
And I didn't.

AVERY
(sets the bag down on the floor)
I didn't want you to see me like that.

TAYLOR
Like what?

AVERY
I lost the job. Then the apartment. I was on her couch with the blinds closed. I didn't want you to be the one who had to pick me up.

TAYLOR
That's my whole job.

AVERY
I didn't want it to be.

TAYLOR
(the chain stays on)
Are you okay now?

AVERY
Better. Not okay.

TAYLOR
(takes the chain off, doesn't open the door yet)
The dumplings are getting cold.

AVERY
They're always cold by the time they get anywhere.`},

{id:'the-note', title:'The Note', trains:'secret', tags:['secret','status','objective'], you:'DREW',
 setup:'A teacher and a parent after school. The kid wrote a note about home. The parent wants it back. The teacher has already made a copy.',
 text:`INT. EMPTY CLASSROOM - DAY

Small chairs. Construction paper turkeys on the wall. DREW, the teacher, behind a desk. SAGE, a parent, stands.

SAGE
You said it was about a note.

DREW
Thank you for coming in.

SAGE
I took off work.

DREW
I appreciate that.

SAGE
Can I see it?

DREW
It was a writing exercise. "Describe your weekend."

SAGE
Can I see it?

DREW
Most kids wrote about cartoons.

SAGE
(holds out a hand)
It's my kid's handwriting. I'd like to see it.

DREW
He wrote that he wasn't allowed to make noise after six.

SAGE
I work nights. I sleep in the evening.

DREW
He wrote that he eats cereal for dinner.

SAGE
He likes cereal.

DREW
He wrote that the door is locked from outside when you leave.

SAGE
(a long moment)
It's to keep people out. Not to keep him in.

DREW
I believe you.

SAGE
Then give it back.

DREW
I believe you, and I still have to make a phone call. I'd rather you were here when I make it.

SAGE
(sits down in a child's chair)
Who do you call?

DREW
Someone whose job is to help. Not to take him. To help.`},

{id:'last-practice', title:'Last Practice', trains:'tactic', tags:['tactic','status','listening'], you:'JAMIE',
 setup:'The night before the final. Coach and star player in an empty gym. The player wants to quit. You need them on the court tomorrow.',
 text:`INT. GYM - NIGHT

One row of lights on. A ball rack. JAMIE, the coach, rebounds for REMY, who keeps shooting and missing.

JAMIE
Elbow.

REMY
I know.

JAMIE
Then use it.

REMY
(misses again)
I'm not playing tomorrow.

JAMIE
You're playing tomorrow.

REMY
I'm telling you I'm not.

JAMIE
And I'm telling you you are. We're both telling.

REMY
Scouts are coming.

JAMIE
That's good news.

REMY
For you. If I play bad, they see it. If I don't play, they see nothing.

JAMIE
(holds the ball)
So you'd rather be nothing than be bad.

REMY
At least nothing's not on tape.

JAMIE
You know what's on tape? Last year. Regional. Down nine with two minutes.

REMY
We lost that game.

JAMIE
We lost by one. You scored eight of the nine. On a sprained ankle.

REMY
And we lost.

JAMIE
Scouts don't watch the scoreboard. They watch who wants the ball.

REMY
(beat)
What if I don't want it?

JAMIE
(passes it, hard)
Then don't catch that.

Remy catches it.

JAMIE
Elbow.`},

{id:'overbooked', title:'Overbooked', trains:'comedy', tags:['comedy','status','tactic'], you:'LEE',
 setup:'A gate agent and the last passenger without a seat. The flight is the last one tonight. You both have reasons.',
 text:`INT. AIRPORT GATE - NIGHT

Empty seats. A single agent, CHARLIE, at the podium. LEE approaches with a boarding pass and a very small dog in a bag.

LEE
It says seat 14C.

CHARLIE
It does say that.

LEE
And yet.

CHARLIE
And yet 14C is occupied by a pilot.

LEE
Is the pilot flying the plane?

CHARLIE
No. The pilot is going home.

LEE
I'm also going home.

CHARLIE
I understand. We're offering a hotel voucher and a meal credit.

LEE
How much is the meal credit?

CHARLIE
Twelve dollars.

LEE
In this airport, that's a bag of almonds.

CHARLIE
They're very good almonds.

LEE
(lifts the bag slightly)
Pickles has never spent a night in a hotel.

CHARLIE
Pickles.

LEE
Pickles has anxiety.

CHARLIE
(looks at the dog, then the screen)
There's one seat left.

LEE
I knew it.

CHARLIE
It's mine. I was going to fly home on it after my shift.

LEE
(long beat)
How old are your kids?

CHARLIE
How did you...

LEE
There's a drawing taped to your podium.

CHARLIE
(covers it)
Take the voucher. I'll get you on the six a.m. And I'll throw in a second bag of almonds.`},

{id:'the-ashes', title:'The Ashes', trains:'relationship', tags:['relationship','comedy','silence'], you:'REESE',
 setup:'Divorced a year. Your dog died. The urn is on the table between you. Neither of you wants to say who gets it.',
 text:`INT. COFFEE SHOP - DAY

A small cardboard urn on the table. REESE and HAYDEN on either side, coffee untouched.

HAYDEN
He's smaller than I thought.

REESE
He was always smaller than you thought.

HAYDEN
He thought he was a big dog.

REESE
That's what made him a good dog.

HAYDEN
(beat)
The vet said we could split it.

REESE
Split him.

HAYDEN
That's what the vet said.

REESE
I'm not splitting him. He spent his whole life being split. Weekends at yours. Weekdays at mine.

HAYDEN
He liked the drive.

REESE
He threw up on every drive.

HAYDEN
And then he liked it.

REESE
(slides the urn an inch toward Hayden, then stops)
You should take him.

HAYDEN
You were the one he slept next to.

REESE
You were the one he waited at the door for.

HAYDEN
He waited at the door for the mailman.

REESE
(laughs, then doesn't)
I don't want to be the one who has him on a shelf.

HAYDEN
Then we don't put him on a shelf.

REESE
Where else?

HAYDEN
The lake. Where he chased the geese. We go together. Once.

REESE
(a long look)
Once.`},

{id:'the-raise', title:'The Raise', trains:'secret', tags:['secret','objective','status'], you:'MORGAN',
 setup:'Your best employee asks for a raise. They deserve it. You know layoffs are announced Friday and you\'re not allowed to say.',
 text:`INT. MANAGER'S OFFICE - DAY

Blinds half closed. MORGAN behind the desk. ELLIS sits forward, a printed list in hand.

ELLIS
I brought a list.

MORGAN
Of course you did.

ELLIS
Three accounts I brought in. Two I saved. The software thing I fixed on a Sunday.

MORGAN
I remember the Sunday.

ELLIS
I'm asking for eight percent.

MORGAN
That's reasonable.

ELLIS
So that's a yes?

MORGAN
It's a "that's reasonable."

ELLIS
(sets the list down)
What's going on?

MORGAN
Nothing's going on.

ELLIS
You haven't looked at me since I sat down.

MORGAN
I'm looking at you now.

ELLIS
You're looking at my forehead.

MORGAN
(meets their eyes)
Have you updated your resume lately?

ELLIS
Why would I update my resume?

MORGAN
It's a good habit. Everyone should. Every year.

ELLIS
(beat)
Is it Friday?

MORGAN
I can't talk about Friday.

ELLIS
That's a yes.

MORGAN
It's a "you should update your resume." And it's a "I'll write you the best reference anyone's ever read." That's all I've got.`},

{id:'cold-feet', title:'Cold Feet', trains:'listening', tags:['listening','secret','relationship'], you:'JORDAN',
 setup:'The night before a wedding. The best friend finds the one getting married sitting in a parked car outside the venue.',
 text:`INT. PARKED CAR - NIGHT

Rain on the windshield. QUINN in the driver's seat, still in a suit jacket from the rehearsal dinner. JORDAN gets in the passenger side.

JORDAN
They're looking for you.

QUINN
I know.

JORDAN
Your aunt thinks you were kidnapped.

QUINN
She would.

Jordan waits.

QUINN
Do you think people know? When they're doing the right thing?

JORDAN
I think people mostly guess.

QUINN
That's not comforting.

JORDAN
It wasn't supposed to be.

QUINN
I love her.

JORDAN
I know you do.

QUINN
I don't know if I love the life. The house. Her parents every Sunday. I don't know if I'm built for Sundays.

Jordan doesn't answer right away.

QUINN
Say something.

JORDAN
You want me to tell you to go in or to drive away.

QUINN
I want you to tell me something true.

JORDAN
You called me first when your dad died. Not her. Me.

QUINN
(long beat)
What does that mean?

JORDAN
I don't know. You asked for true. That's what I've got.`},

{id:'the-ledger', title:'The Ledger', trains:'objective', tags:['objective','relationship','tactic'], you:'SHAY',
 setup:'You keep the books for a friend\'s restaurant. Eleven thousand dollars is missing. You need them to say it out loud before you have to report it.',
 text:`INT. RESTAURANT KITCHEN - AFTER CLOSE

Steel counters. A dishwasher running. SHAY with a laptop open. KIT, the owner, scrubbing a pan that's already clean.

SHAY
Can you put that down?

KIT
It's burnt on.

SHAY
It's been clean for five minutes.

KIT
(keeps scrubbing)
What's wrong with the numbers?

SHAY
Who said anything was wrong?

KIT
You only bring the laptop in here when something's wrong.

SHAY
The cash deposits are short.

KIT
How short?

SHAY
You know how short.

KIT
(stops scrubbing)
Eleven.

SHAY
Eleven thousand, two hundred.

KIT
I was going to put it back.

SHAY
That's what everyone says.

KIT
My mother's house was going to auction. Thursday. I had until Thursday.

SHAY
You could have asked me.

KIT
You'd have said no.

SHAY
I'd have said "let's figure it out." That's a different word than no.

KIT
(sets the pan down)
What happens now?

SHAY
Now you say it. To me. All of it. With the dates. And then we figure it out. Before I have to call anyone.`},

{id:'lights-out', title:'Lights Out', trains:'circumstance', tags:['circumstance','comedy','relationship'], you:'DANA',
 setup:'A citywide blackout. You knock on a neighbor\'s door for a flashlight. You\'ve lived next to each other for four years and never spoken.',
 text:`INT. APARTMENT HALLWAY - NIGHT

Pitch black except a phone flashlight. DANA knocks. CAMERON opens the door holding a candle shaped like a pineapple.

DANA
Hi. Sorry. I'm next door.

CAMERON
I know. 4B.

DANA
You know my apartment number?

CAMERON
It's on your door.

DANA
Right. Do you have a flashlight?

CAMERON
I have this.

DANA
It's a pineapple.

CAMERON
It was a gift. It smells like a pineapple, too, if that helps.

DANA
It doesn't, really.

CAMERON
(beat)
You play the cello.

DANA
How do you...

CAMERON
Thin walls. Tuesday and Thursday. Around nine.

DANA
Oh no. I'm so sorry.

CAMERON
Don't be. You've gotten a lot better.

DANA
(mortified)
That's worse. That means you heard when I was bad.

CAMERON
You were very bad. For about a year.

DANA
I'm going to move.

CAMERON
(holds the pineapple out)
Take it. Play something. I'll leave my door open.

DANA
In the dark?

CAMERON
That's the only way I've ever heard you.`},

{id:'retraction', title:'Retraction', trains:'reversal', tags:['reversal','objective','status'], you:'ROWAN',
 setup:'A reporter meets a source who wants their quote pulled from tomorrow\'s story. The paper goes to print in an hour. Halfway in, you learn who\'s really asking.',
 text:`INT. HOTEL BAR - NIGHT

Nearly empty. ROWAN, a reporter, with a phone face down. PARKER, the source, has not touched a drink.

PARKER
I need you to take my name off it.

ROWAN
You're not named. You're "a person close to the company."

PARKER
There are four people close to the company.

ROWAN
Then you're one in four.

PARKER
I'm the only one who knows what the inspector said.

ROWAN
(beat)
Did someone talk to you?

PARKER
Nobody talked to me.

ROWAN
You were sure on Monday. You were angry on Monday.

PARKER
I was a lot of things on Monday.

ROWAN
What changed?

PARKER
Nothing changed.

ROWAN
Your hands are shaking.

PARKER
It's cold in here.

ROWAN
(turns over the phone. A text on the screen)
My editor just got a call from the company's lawyer. Asking whether my "anonymous source" works in quality control.

PARKER
(very still)
I didn't tell them.

ROWAN
I know you didn't. I didn't either. Which means somebody in that building already knows it's you.

PARKER
So it doesn't matter if you pull it.

ROWAN
It matters more if I don't. If it runs, you're a whistleblower. If it doesn't, you're just someone they fire.`},

{id:'tow-yard', title:'Tow Yard', trains:'tactic', tags:['tactic','comedy','circumstance'], you:'LANE',
 setup:'Your car got towed with a wedding dress in the back seat. The wedding is in three hours. The tow yard closes in ten minutes.',
 text:`INT. TOW YARD BOOTH - NIGHT

Bulletproof glass with a slot. MARLOWE behind it, finishing a sandwich. LANE runs up, out of breath.

LANE
White sedan. Towed from Elm.

MARLOWE
We close in ten minutes.

LANE
That's why I'm running.

MARLOWE
Three hundred and twelve dollars.

LANE
I have two hundred and forty.

MARLOWE
Then you have a car tomorrow.

LANE
There's a wedding dress in the back seat.

MARLOWE
That's not a payment method.

LANE
The wedding's in three hours.

MARLOWE
Yours?

LANE
My sister's. I'm the one who was supposed to bring the dress.

MARLOWE
(puts the sandwich down)
Was this the same sister who parked in a tow zone?

LANE
No. That was me. I parked in a tow zone because I was buying her a gift.

MARLOWE
What gift?

LANE
(holds up a small bag)
A cake topper. Two little ferrets in a top hat and a veil.

MARLOWE
Why ferrets?

LANE
That's how they met. Long story. Ferret rescue.

MARLOWE
(a long look at the bag)
Seventy-two dollars short.

LANE
I know.

MARLOWE
(slides a form through the slot)
Sign here. Write "ferret emergency" in the reason box. If my supervisor asks, I'll say you looked very sincere.`},

{id:'bad-reception', title:'Bad Reception', trains:'listening', tags:['listening','circumstance','secret'], you:'ROBIN',
 setup:'A phone call between a parent on a road trip and their grown kid back home. The signal keeps dropping. Something is wrong, and neither of you will say it first.',
 text:`INT. KITCHEN - NIGHT / INT. CAR - NIGHT (INTERCUT)

ROBIN at a kitchen table with a cold cup of tea. EMERY in a parked car at a gas station, phone on speaker.

ROBIN
Hello? You're breaking up.

EMERY
I'm here. I'm at a gas station.

ROBIN
Where?

EMERY
Some town. It has a giant fiberglass trout.

ROBIN
You said you'd call from the motel.

EMERY
I didn't make it to the motel.

ROBIN
Why not?

Static on the line.

ROBIN
Hello?

EMERY
I'm here. I pulled over. I got a little turned around.

ROBIN
You've driven that road a hundred times.

EMERY
That's what I keep telling myself.

ROBIN
(beat)
Did you take your pills today?

EMERY
I think so.

ROBIN
You think so.

EMERY
The bottle's in my bag. I just couldn't remember if I'd already...

ROBIN
Okay. Okay. Stay where you are. Next to the trout.

EMERY
I'm fine. It's just a turn.

ROBIN
I know. Stay next to the trout anyway. I'm getting in the car.`},

{id:'after-the-meeting', title:'After the Meeting', trains:'secret', tags:['secret','listening','relationship'], you:'BLAKE',
 setup:'Folding chairs after a neighborhood meeting about a new development. One of you voted for it. The other lost their shop because of it.',
 text:`INT. CHURCH BASEMENT - NIGHT

Stacks of folding chairs. BLAKE folds chairs. TAYLOR stacks them, a little too hard.

TAYLOR
You don't have to help.

BLAKE
I always help.

TAYLOR
You always help. You always vote. You always know which way the wind is blowing.

BLAKE
That's not fair.

TAYLOR
I counted the hands. You had yours up.

BLAKE
I had my hand up for the park. The park was in the same proposal.

TAYLOR
The park is going where my shop was.

BLAKE
(stops folding)
I know.

TAYLOR
You bought shoes from me for eleven years.

BLAKE
Twelve.

TAYLOR
Twelve. And you couldn't keep your hand down for one vote.

BLAKE
My kid has asthma. The air on that corner is the worst in the county. The park comes with the trees.

TAYLOR
(a beat)
You never told me that.

BLAKE
You never asked about my kid. You asked about my arches.

TAYLOR
(sets down the last chair)
That's because your arches are terrible.

BLAKE
I know.

TAYLOR
I'll still fit you. Wherever I end up. You'll have to drive.

BLAKE
I'll drive.`},

{id:'the-watch', title:'The Watch', trains:'status', tags:['status','listening','secret'], you:'SAGE',
 setup:'A pawn shop. Someone is selling a family watch. You run the counter and you know it\'s worth more than they think, and that it might not be theirs.',
 text:`INT. PAWN SHOP - DAY

Glass cases. A bell over the door. SAGE behind the counter with a loupe. CHARLIE sets down an old gold watch on a cloth.

CHARLIE
It was my grandfather's.

SAGE
(picks it up, turns it over)
Swiss.

CHARLIE
Is that good?

SAGE
It's not bad.

CHARLIE
How much?

SAGE
What were you hoping?

CHARLIE
Two hundred?

SAGE
(the loupe goes to an eye)
There's an engraving on the back.

CHARLIE
Is there?

SAGE
"To R. For forty years. Love, M."

CHARLIE
My grandfather's name was Robert.

SAGE
What was your grandmother's name?

CHARLIE
(a beat too long)
Mary.

SAGE
That's a good guess.

CHARLIE
It's not a guess.

SAGE
(sets the watch down, gently)
This is worth about four thousand dollars. I'm not going to give you two hundred for it. And I'm not going to give you four thousand either.

CHARLIE
Why not?

SAGE
Because a woman came in Tuesday and filled out a report for this exact watch. Her husband's. He passed in March.

CHARLIE
(very quiet)
She's my aunt. She doesn't know I took it.

SAGE
Then here's what's going to happen. You're going to take it back to her. And I'm going to forget you came in.`},

{id:'understudy', title:'The Understudy', trains:'status', tags:['status','reversal','tactic'], you:'NOEL',
 setup:'Thirty minutes before curtain. The lead can\'t go on. The understudy has waited two years for this. The lead wants to be the one to say it.',
 text:`INT. DRESSING ROOM - NIGHT

Mirror bulbs. JESSE, the lead, in costume, very pale. NOEL, the understudy, in street clothes at the door.

NOEL
Stage manager said you wanted me.

JESSE
Close the door.

NOEL
(closes it)
Are you okay?

JESSE
I can't feel my left hand.

NOEL
Since when?

JESSE
Since warm-up. It's probably nothing.

NOEL
Then you'll be fine.

JESSE
I can't hold the knife in act two.

NOEL
You'll switch hands.

JESSE
I've done it with the left for two hundred shows. I'll miss the mark. I'll miss the cue.

NOEL
(carefully)
What do you want me to say?

JESSE
I want you to tell me you're not ready.

NOEL
I've been ready for two years.

JESSE
I know. I've watched you. Every night. In the wings, mouthing every line.

NOEL
(beat)
I didn't know you saw that.

JESSE
I want you to know I saw it. Before they tell you. I wanted to be the one.

NOEL
You're telling me you're out.

JESSE
(holds out the costume jacket)
I'm telling you it's yours tonight. Don't do it like me. Do it like the version you've been doing in the wings.`},

{id:'morning-show', title:'Morning Show', trains:'comedy', tags:['comedy','reversal','status'], you:'FRANKIE',
 setup:'Two co-hosts of a failing local morning show, two minutes before air. One of you just found out the other is getting their own show.',
 text:`INT. TV STUDIO - EARLY MORNING

A fake kitchen set. A bowl of plastic fruit. FRANKIE adjusts a mic. REMY fixes hair in a phone camera.

FRANKIE
Two minutes.

REMY
I know.

FRANKIE
Today's cooking segment is a man who carves animals out of butter.

REMY
I saw.

FRANKIE
He brought a butter horse.

REMY
That's a lot of butter.

FRANKIE
(beat)
Congratulations, by the way.

REMY
On what?

FRANKIE
Your show. "Mornings with Remy." I saw the email. You forwarded it to me by accident.

REMY
(lowers the phone)
I was going to tell you after the butter.

FRANKIE
After the butter.

REMY
It seemed like a calmer time.

FRANKIE
It's a horse made of butter, Remy. It's not a calm segment.

REMY
They asked if you'd come with me. As a contributor.

FRANKIE
A contributor.

REMY
Twice a week. Weather and pets.

FRANKIE
I've been doing this for nine years.

REMY
I know. That's why I told them you were the reason the show worked.

FRANKIE
(a long look)
Did you?

REMY
I said it in the meeting. In front of everyone.

FRANKIE
(the floor manager counts down from off camera)
We're on.

REMY
(turns to camera, bright)
Good morning! We have a horse made of butter!`},

{id:'discharge', title:'Discharge', trains:'reversal', tags:['reversal','listening','objective'], you:'CHARLIE',
 setup:'A patient fully dressed and ready to go home. The doctor comes in to sign the papers. One last test result just came back.',
 text:`INT. HOSPITAL ROOM - DAY

A packed bag on the bed. CHARLIE in a coat, shoes tied. AVERY, a doctor, enters with a tablet.

CHARLIE
There she is. The signature.

AVERY
Morning.

CHARLIE
My ride's downstairs. My neighbor. She parks in the ambulance lane and dares them.

AVERY
Can you sit for a second?

CHARLIE
I've been sitting for six days.

AVERY
One more second.

CHARLIE
(doesn't sit)
You're doing the face.

AVERY
What face?

CHARLIE
The face they do on the shows right before the commercial.

AVERY
(sits, so Charlie will)
One of your blood tests came back this morning. It's not what we expected.

CHARLIE
I came in for a broken wrist.

AVERY
I know. And the wrist is healing. This is something else. Something we found because you were here.

CHARLIE
(sits, finally)
Is it bad?

AVERY
It's early. That's the good part. It's early because you broke your wrist.

CHARLIE
So falling off a ladder saved my life.

AVERY
It might have.

CHARLIE
(a long beat, then)
I'm going to need you to tell my neighbor. She's going to want to park somewhere worse.`}
];

/* ---------- picking today's scene ---------- */
const KEY='theactorpage_daily_v1';
function read(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&d.done) return d; }catch(e){} return {done:{},today:null,skipped:[]}; }
function write(d){ try{ localStorage.setItem(KEY,JSON.stringify(d)); }catch(e){} }
function localDate(t){ const d=t?new Date(t):new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function hash(s){ let h=5381; s=String(s); for(let i=0;i<s.length;i++) h=((h*33)^s.charCodeAt(i))>>>0; return h; }

/* What Actor OS shows you haven't tried yet (5.22 choices), least tried first. */
function leanFrom(){
 try{
  const st=JSON.parse(localStorage.getItem('actor_os_wired_v06')||'null');
  const takes=(st&&st.takes)||[]; if(!takes.length) return [];
  const n={objective:0,tactic:0,relationship:0,secret:0,circumstance:0};
  takes.forEach(t=>{ const k=(t.trying&&t.trying.kind)||t.nextChoice; if(k&&k in n) n[k]++; });
  return Object.keys(n).sort((a,b)=>n[a]-n[b]);
 }catch(e){ return []; }
}
const D={};
D.all=function(){ return SCENES.slice(); };
D.get=function(id){ return SCENES.find(s=>s.id===id)||null; };
/* Today's scene: the same all day (local date), a scene you haven't done,
   leaning toward what you haven't tried. "Another one" moves on. */
D.today=function(opts){
 opts=opts||{}; const d=read(), day=localDate(opts.now);
 if(d.today&&d.today.date===day&&!opts.another&&D.get(d.today.id)) return D.get(d.today.id);
 const skipped=new Set(d.skipped||[]);
 let pool=SCENES.filter(s=>!d.done[s.id]&&!skipped.has(s.id));
 if(!pool.length){ pool=SCENES.filter(s=>!d.done[s.id]); d.skipped=[]; }
 if(!pool.length){ pool=SCENES.slice(); d.done={}; }        // all done: start again
 const lean=opts.lean||leanFrom();
 if(lean.length){ const want=lean[0]; const leaned=pool.filter(s=>s.tags.indexOf(want)>=0); if(leaned.length) pool=leaned; }
 if(opts.another&&d.today&&pool.length>1) pool=pool.filter(s=>s.id!==d.today.id);
 const pick=pool[hash(day+'|'+pool.map(s=>s.id).join(','))%pool.length];
 if(opts.another&&d.today){ d.skipped=(d.skipped||[]).concat(d.today.id); }
 d.today={date:day,id:pick.id}; write(d);
 return pick;
};
D.markDone=function(id,when){ const d=read(); d.done[id]=localDate(when); write(d); };
D.isDone=function(id){ return !!read().done[id]; };
D.doneCount=function(){ return Object.keys(read().done).length; };
D.fileName=function(s){ return "Practice scene - "+s.title; };
/* sides kept under the old name still count */
D.fromFile=function(f){ const m=String(f||'').match(/^(?:Practice scene|Today's scene) - (.+)$/); return m?SCENES.find(s=>s.title===m[1])||null:null; };
/* Old: put it on the sides shelf. No longer used (practice keeps to its own lane); kept so old calls don't break. */
D.toShelf=function(s,me){
 if(!g.Shelf) return null;
 const it=g.Shelf.put({text:s.text,file:D.fileName(s),from:"Practice scene",tool:'daily'});
 if(it) g.Shelf.setMe(it.id,me||s.you,'daily');
 return it;
};
/* Practice scenes keep to their own lane: never on the sides shelf, never your current sides anywhere.
   A tap hands one scene to one tool, once (TAPE IT -> Actor OS, LEARN -> Memorizer). */
const HKEY='theactorpage_handoff_practice', LKEY='theactorpage_practice_last';
D.isPractice=function(f){ return /^(?:Practice scene|Today's scene) - /.test(String(f||'')); };
D.pick=function(){ let last=''; try{ last=localStorage.getItem(LKEY)||''; }catch(e){}
 const pool=SCENES.filter(s=>s.id!==last), s=pool[Math.floor(Math.random()*pool.length)]||SCENES[0]; try{ localStorage.setItem(LKEY,s.id); }catch(e){} return s; };
D.current=function(){ let id=''; try{ id=localStorage.getItem(LKEY)||''; }catch(e){} return D.get(id)||D.pick(); };
D.handoff=function(s,me,tool){ try{ localStorage.setItem(HKEY,JSON.stringify({id:s.id,me:me||s.you,tool:tool,at:Date.now()})); }catch(e){} };
D.takeHandoff=function(tool){ let h=null; try{ h=JSON.parse(localStorage.getItem(HKEY)||'null'); }catch(e){}
 if(!h||h.tool!==tool||Date.now()-h.at>10*60000) return null; try{ localStorage.removeItem(HKEY); }catch(e){} const s=D.get(h.id); return s?{scene:s,text:s.text,file:D.fileName(s),me:h.me}:null; };
/* practice scenes put on the shelf by the old version: taken off, so they stop showing up as your sides */
D.cleanShelf=function(){ const S=g.Shelf; if(!S||!S.all) return 0; let n=0; S.all().forEach(it=>{ if(D.isPractice(it.file)){ S.remove(it.id); n++; } }); return n; };
D.parts=function(s){ const n=[]; s.text.replace(/^([A-Z][A-Z]+)$/gm,(m,x)=>{ if(n.indexOf(x)<0) n.push(x); }); return n; };

if(typeof module!=='undefined') module.exports=D;
g.DailyScenes=D;
})(typeof window!=='undefined'?window:globalThis);
