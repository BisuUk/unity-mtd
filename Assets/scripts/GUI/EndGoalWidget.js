#pragma strict

var iconStart : Transform;
var iconPrefab : Transform;
var iconSpacing : float;
var iconSizing : Vector3;
var iconFilledSpriteName : String;
// Hide from inspector
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
   iconWidget.transform.localScale = iconSizing;
   icons.Add(icon);
   iconCount += 1;
}

function OnPressGoalButton()
{
   UIControl.CurrentUI().SendMessage("OnSelectGoalIcon", goal, SendMessageOptions.DontRequireReceiver);
}

function UnitReachedGoal()
{
   //Debug.Log("UnitReachedGoal: index="+goal.lastFilledIndex);
   icons[goal.lastFilledIndex].spriteName = iconFilledSpriteName;
   icons[goal.lastFilledIndex].gameObject.GetComponent(iTweenEvent).Play();
}



