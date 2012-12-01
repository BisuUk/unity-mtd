#pragma strict

static var uiIndex : int = 1;

var parScore : UILabel;
var parCount : UILabel;
var noAbilityScore : UILabel;
var noAbilityCount : UILabel;
var noDeathScore : UILabel;
var noDeathCount : UILabel;
var timeScore : UILabel;
var timeCount : UILabel;
var score : UILabel;

private var calcScore : int;


function OnNextLevel()
{
   Game.control.nextLevel = Game.map.nextLevel;
   Game.control.InitLevel(GameModeType.GAMEMODE_PUZZLE, Game.map.nextLevel);
}

function OnSwitchTo()
{
   CalculateScore();
}

function CalculateScore()
{
   Debug.Log("CalculateScore");
   var minutes : float;
   var seconds : float;
   var tempScore : int;
   calcScore = 0;

   // PAR
   tempScore = Game.control.numUnitsUsed - Game.map.unitPar;
   if (tempScore <= 0)
   {
      parScore.color = Color.green;
      parScore.text = tempScore.ToString();

      parCount.color = Color.green;
      parCount.text = "( " + Game.control.numUnitsUsed + "/" + Game.map.unitPar + " )";
   }
   else
   {
      parScore.color = Color.red;
      parScore.text = tempScore.ToString();

      parCount.color = Color.red;
      parCount.text = "( +" + Game.control.numUnitsUsed + "/" + Game.map.unitPar + " )";
   }
   calcScore += tempScore;

   // TIME BONUS
   var timeDelta = Game.map.timeBonusLimit - Game.control.levelTime;
   if (timeDelta >= 0)
   {
      tempScore = (Mathf.RoundToInt(timeDelta) * 10);

      timeScore.color = Color.green;
      timeScore.text = tempScore.ToString();

      minutes = Mathf.Floor(timeDelta/60.0);
      seconds = Mathf.Floor(timeDelta%60.0);
      timeCount.color = Color.green;
      timeCount.text = "( " + minutes + ":" + seconds+ " )";
   }
   else
   {
      tempScore = 0;

      timeScore.color = Color.white;
      timeScore.text = tempScore.ToString();

      minutes = Mathf.Floor(timeDelta/60.0);
      seconds = Mathf.Floor(timeDelta%60.0);
      timeCount.color = Color.red;
      timeCount.text = "( " + minutes + ":" + seconds+ " )";
   }
   calcScore += tempScore;

   // NO ABILITIES BONUS
   if (Game.control.numAbilitiesUsed == 0)
   {
      tempScore = Game.map.noAbilityBonus;

      noAbilityScore.color = Color.green;
      noAbilityScore.text = tempScore.ToString();

      noAbilityCount.text = "";
   }
   else
   {
      tempScore = 0;

      noAbilityScore.color = Color.white;
      noAbilityScore.text = tempScore.ToString();

      noAbilityCount.text = "( " + Game.control.numAbilitiesUsed.ToString() + " )";
      noAbilityCount.color = Color.red;
   }
   calcScore += tempScore;


   // NO DEATH BONUS
   if (Game.control.numUnitDeaths == 0)
   {
      tempScore = Game.map.noDeathBonus;

      noDeathScore.color = Color.green;
      noDeathScore.text = tempScore.ToString();

      noDeathCount.text = "";
   }
   else
   {
      tempScore = 0;

      noDeathScore.color = Color.white;
      noDeathScore.text = tempScore.ToString();

      noDeathCount.text = "( " + Game.control.numUnitDeaths.ToString() + " )";
      noDeathCount.color = Color.red;
   }
   calcScore += tempScore;




   Game.control.score = calcScore;
}