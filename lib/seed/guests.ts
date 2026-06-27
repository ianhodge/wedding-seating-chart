// Parsed from the couple's RSVP spreadsheet. Only attending guests are listed
// (plus-ones without their own row RSVP'd "no" and are omitted).
// Each inner array is a "party" (a couple/family kept together when seating).

export interface RawGroup {
  name: string;
  isPlaceholder?: boolean; // seated by the mother-in-law
  isCouple?: boolean; // Matt + Ian -> sweetheart table
  parties: string[][];
}

export const RAW_GROUPS: RawGroup[] = [
  {
    name: "Ian + Matt",
    isCouple: true,
    parties: [["Ian Hodge", "Matt Higgins"]],
  },
  {
    name: "DC Runners",
    parties: [
      ["Alex Jarrah", "Annika Barth"],
      ["Cameron Peters", "Meg Parker"],
      ["Jacob Meyer", "Maggie Vogelhut"],
      ["Jacob Jordan"],
      ["Steve Klug"],
      ["Zach Emmanuel"],
      ["Ian Parker"],
    ],
  },
  {
    name: "Higgins Family Friends",
    isPlaceholder: true,
    parties: [
      ["Jan Mooney", "Kevin Mooney"],
      ["Mike Delman", "Laura Delman"],
      ["Nancy Cruz", "Andy Kronen"],
      ["Teresa Holmes", "Edd Key"],
      ["Lindsay Miller", "Jed Miller"],
      ["Sonal Shah", "Michey Mehta"],
    ],
  },
  {
    name: "Higgins Side",
    isPlaceholder: true,
    parties: [
      ["Daniel Taylor", "Casey Taylor"],
      ["Debbie Taylor", "Mac Taylor"],
      ["Jen Gaines", "Dave Gaines"],
      ["Jimmy Winsor"],
      ["Luke Winsor"],
      ["Becca Bundy"],
    ],
  },
  {
    name: "Hodge Family",
    parties: [
      ["Brooke Hodge"],
      ["Kacey Edenfield", "Harland LaVigne"],
      ["Haley Hodge", "Ethan Oro"],
      ["Ryan Hodge"],
      ["Maggie Hodge"],
      ["Melanie Hodge", "Dennis Hodge"],
      ["Doug Hodge", "Toni Hodge"],
      ["John Hodge", "Stacey Keare"],
    ],
  },
  {
    name: "Ian Stanford",
    parties: [
      ["Andrew Quirk"],
      ["Adam Elliot", "Delaney Rua"],
      ["Carson Conley"],
      ["Anna Ekholm"],
      ["Ben Josie", "Brittany Ater"],
      ["Lakshmi Prakash"],
      ["Isaac Goldstein", "Hayden Tanabe"],
      ["Michelle Hull"],
      ["Jordan Brinn", "Nicholas Bien"],
      ["Cody Hankins"],
      ["Matt Waltman"],
      ["Maddy Libbey", "Ben Boston"],
      ["Chris Yeh", "Alyssa Kam"],
      ["Sarah Stebbins"],
      ["Akshay Jaggi"],
      ["Tashrima Hossain"],
    ],
  },
  {
    name: "Indonesia",
    parties: [
      ["Madelyn Usher", "Shawn Hils"],
      ["Dalton Foutski", "Sandra Foutski"],
      ["Gracia Hadiwidjaja", "Joandy Pratama"],
      ["Tim Ravis"],
    ],
  },
  {
    name: "Knoxville",
    parties: [["Michael Xiong"], ["James Eun"]],
  },
  {
    name: "Kristine Friends",
    parties: [
      ["Sally Norred", "Chris Norred"],
      ["Marlen McKinney", "John Bellaschi"],
      ["Michelle Watts", "Jimmy Watts"],
      ["Caroline Nelson", "Amy Gilbert"],
      ["Monique Berke", "Andy Berke"],
      ["Michelle Gillespy-Goldstein", "Alan Goldstein"],
      ["Kristine Lassen"],
    ],
  },
  {
    name: "Lassen Family",
    parties: [["Kara Lobritz"], ["Kent Lassen", "Susan Lassen"], ["Martha Seery"]],
  },
  {
    name: "Lawyers",
    parties: [
      ["Aisha Keown-Lang", "Ian Reynolds"],
      ["Jess Levy", "Rohan Mehta"],
      ["Victor Flores"],
    ],
  },
  {
    name: "Magid + Core",
    parties: [
      ["Brian Higgins", "Naomi Higgins"],
      ["Emma Magid", "Ryan Pinch"],
      ["Karen Magid"],
      ["Leslie Magid Higgins", "Pete Higgins"],
      ["Andrew Higgins", "Freddie Higgins", "Tara Higgins", "Angie Balczarekova"],
      ["Hilari Cohen", "Ken Cohen"],
    ],
  },
  {
    name: "Matt Stanford",
    parties: [
      ["Aileen Lerch", "Bridget Morrison"],
      ["Abby Dow", "John Kadavy"],
      ["Amanda Brockbank"],
      ["Eric Hermann"],
      ["Stuart Upfill Brown"],
      ["Costner McKenzie", "Mike Mongelli"],
      ["Kyra Vargas", "Davis Johnson"],
      ["Peggy Moriarty", "Nick Van Hollen"],
      ["Calvin Studebaker", "Christine Chung"],
      ["Charlotte Martine", "Jimmy Guido"],
      ["Esthena Barlow"],
      ["Kevin Crain", "Michelle Ferris"],
      ["Michele Charles"],
      ["Kjellen Belcher", "Arjun Nayini"],
      ["Peter Doyle", "Gwen Umbach"],
      ["Chloe Koseff"],
      ["Scott Swartz", "Avery Anderson"],
      ["Winston Joe", "Meredith Caldwell"],
      ["Brooke Davis", "Marcus Munoz"],
      ["Luis Alvarez", "Max Murphy"],
      ["Rocco Cervantes"],
      ["Shireen Pourbemani"],
    ],
  },
  {
    name: "NYC Gays",
    parties: [
      ["Michael Maloof"],
      ["Matt Bemis", "Jonah Von Der Embse"],
      ["Scottie Nelson", "Zach Denny"],
      ["Craig Nelson", "Kellen Sandvik"],
    ],
  },
  {
    name: "Other",
    parties: [
      ["Vamsi Damerla", "Min Zhong"],
      ["Jill Patton", "Ben Patton"],
      ["Benedikt Bunz"],
      ["Cason Reily", "Eva Mooney"],
    ],
  },
  {
    name: "Pete + Les Friends",
    isPlaceholder: true,
    parties: [
      ["Alfie Treleven", "Carolyn Treleven"],
      ["Bob Ceremszak", "Kathy Ceremszak"],
      ["Seth Franklin", "Kathy Franklin"],
      ["Eddie Poplawsi", "Kim Poplawsi"],
      ["Kathy Davis", "Phil Davis"],
      ["Dana Doucette", "Joe Doucette"],
      ["LeaAnne Ottinger", "Joe Ottinger"],
      ["Robbie Bach", "Pauline Bach"],
      ["Todd Dunnington", "Julie Dunnington"],
      ["Scott Kelly", "Sharon Kelly"],
      ["Duane Davis", "Vanessa Fernandez"],
      ["Sarah Rasmussen", "Blair Rasmussen"],
    ],
  },
  {
    name: "Pumas",
    parties: [
      ["Will Jaffe"],
      ["Chris Margard", "Kristen Ellingboe"],
      ["Annie Olsen", "Chris Cain"],
      ["Anya Cohen", "Mark Shroeder"],
      ["Eric Wahl", "Gina Pfingston"],
    ],
  },
  {
    name: "Warp",
    parties: [
      ["Ian Wright", "Bailey Jones"],
      ["Kevin Yang", "Michelle Lee"],
      ["John Rector"],
      ["Jeff Lloyd"],
    ],
  },
];
