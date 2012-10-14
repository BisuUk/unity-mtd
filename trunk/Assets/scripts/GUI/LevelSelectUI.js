#pragma strict

function Start () {

}

function Update () {

}

function OnSelectLevel(go : GameObject)
{
   Game.control.nextLevel = go.name;
   Game.control.InitRound();
}

function OnBack()
{
   UIControl.Back();
}