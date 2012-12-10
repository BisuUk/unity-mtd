#pragma strict

function Start () {

}

function Update () {

}

function OnSelectLevel(go : GameObject)
{
   Game.control.nextLevel = go.name;
   Game.control.InitLevel(GameModeType.GAMEMODE_PUZZLE, go.name);
}

function OnBack()
{
   UIControl.Back();
}