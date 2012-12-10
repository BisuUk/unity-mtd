#pragma strict

var ui : DefendUI;
var tower : Tower;

var buttonCaption : UILabel;
var button  : UIButton;
var buttonBackground : UISlicedSprite;

function OnSelect()
{
   ui.SendMessage("OnSelectSelectionTower", tower, SendMessageOptions.DontRequireReceiver);
}

function SetCaption(caption : String)
{
   buttonCaption.text = caption;
}

function SetColor(color : Color)
{
   button.defaultColor = color;
   buttonBackground.color = color;
}

function OnMouseEnter()
{
   ui.OnMouseEnterTower(tower);
}

function OnMouseExit()
{
   ui.OnMouseExitTower(tower);
}