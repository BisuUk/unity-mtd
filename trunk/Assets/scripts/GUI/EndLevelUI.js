#pragma strict

static var uiIndex : int = 1;

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
}