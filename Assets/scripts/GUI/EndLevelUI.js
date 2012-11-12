#pragma strict

function OnNextLevel()
{
   Game.control.nextLevel = Game.map.nextLevel;
   Game.control.InitRound();
}


