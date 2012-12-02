#pragma strict

static var uiIndex : int = 1;

var completeGroup : Transform;
var failedGroup : Transform;
var parTitle : UILabel;
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

function OnRetryLevel()
{
   Game.control.nextLevel = Application.loadedLevelName;
   Game.control.InitLevel(GameModeType.GAMEMODE_PUZZLE, Application.loadedLevelName);
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

   if (Game.control.levelFailed == false)
   {
      completeGroup.gameObject.SetActive(true);
      failedGroup.gameObject.SetActive(false);

      // PAR
      tempScore = Game.control.numUnitsUsed - Game.map.unitPar;
      if (tempScore <= 0)
      {
         if (tempScore == 0)
         {
            parTitle.color = Color.white;
            parTitle.text = "Even";
            tempScore = Game.map.underParBonusPerUnit;
         }
         else
         {
            parTitle.color = Color.green;
            parTitle.text = (-tempScore).ToString() + " Under";
            tempScore = (-tempScore) * Game.map.underParBonusPerUnit;
            tempScore += Game.map.underParBonusPerUnit; // add to even score
         }
   
         parScore.color = Color.green;
         parScore.text = tempScore.ToString();
   
         parCount.color = Color.green;
         parCount.text = "( " + Game.control.numUnitsUsed + "/" + Game.map.unitPar + " )";
      }
      else
      {
         parTitle.color = Color.red;
         parTitle.text = tempScore.ToString() + " Over";
   
         parScore.color = Color.white;
         parScore.text = "0";
   
         parCount.color = Color.red;
         parCount.text = "( " + Game.control.numUnitsUsed + "/" + Game.map.unitPar + " )";
   
         tempScore = 0;
      }
      calcScore += tempScore;
   
      // TIME BONUS
      var timeDelta : float = Game.map.timeBonusLimit - Game.control.levelTime;
      if (timeDelta >= 0.0)
      {
         tempScore = (Mathf.RoundToInt(timeDelta) * Game.map.timeBonusPerSecond);
   
         timeScore.color = Color.green;
         timeScore.text = tempScore.ToString();
   
         minutes = Mathf.Ceil(timeDelta/60.0)-1;
         seconds = Mathf.Ceil(timeDelta%60.0);
         timeCount.color = Color.green;
         timeCount.text = "( -" + minutes.ToString("#0") + ":" + seconds.ToString("#00") + " )";
      }
      else
      {
         tempScore = 0;
   
         timeScore.color = Color.white;
         timeScore.text = tempScore.ToString();
   
         minutes = Mathf.Ceil(timeDelta/60.0);
         seconds = Mathf.Ceil(timeDelta%60.0);
         timeCount.color = Color.red;
         timeCount.text = "( +" + (-minutes).ToString("#0") + ":" + (-seconds).ToString("#00") + " )";
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
   
      // FINAL SCORE
      score.text = calcScore.ToString();
      Game.control.score = calcScore;
   }
   else
   {
      completeGroup.gameObject.SetActive(false);
      failedGroup.gameObject.SetActive(true);
   }
}