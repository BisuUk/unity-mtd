#pragma strict

var attackUI : AttackUI;
var unit : Unit;

var buttonCaption : UILabel;
var button  : UIButton;
var buttonBackground : UISlicedSprite;

function OnSelectUnit()
{
   attackUI.SendMessage("OnSelectSingleUnit", unit, SendMessageOptions.DontRequireReceiver);
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

function Update()
{
   if (unit==null || unit.health<=0)
      Destroy(gameObject);
}