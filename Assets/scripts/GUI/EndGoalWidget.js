#pragma strict

var iconStart : Transform;
var iconPrefab : Transform;
var iconSpacing : float;

var goal : GoalStation;

private var icons : List.<UISprite>;
private var iconCount : int;

function Awake()
{
   icons = new List.<UISprite>();
}

function AddUnitIcon(color : Color)
{
   var iconWidget : GameObject = NGUITools.AddChild(iconStart.gameObject, iconPrefab.gameObject);
   var icon : UISprite = iconWidget.GetComponent(UISprite);
   icon.color = color;
   iconWidget.transform.localPosition.x += (iconSpacing * iconCount);
   iconWidget.transform.localScale = Vector3(25.0, 25.0, 1.0);
   icons.Add(icon);
   iconCount += 1;
}

function UnitReachedGoal()
{
   Debug.Log("UnitReachedGoal: index="+goal.lastFilledIndex);
   icons[goal.lastFilledIndex].spriteName = "Light";

}



