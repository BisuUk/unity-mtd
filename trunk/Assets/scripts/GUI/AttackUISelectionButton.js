#pragma strict

var attackUI : AttackUI;
var unit : Unit;

var buttonCaption : UILabel;
var button  : UIButton;
var buttonBackground : UISlicedSprite;
var healthBar : UISlider;

function OnSelectUnit()
{
   attackUI.SendMessage("OnClickUnit", unit, SendMessageOptions.DontRequireReceiver);
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
   if (unit==null || unit.health <= 0)
      Destroy(gameObject);
   else
      healthBar.sliderValue = 1.0*unit.health/unit.maxHealth;
}