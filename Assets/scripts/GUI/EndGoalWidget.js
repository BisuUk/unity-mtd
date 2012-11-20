#pragma strict

var iconStart : Transform;
var iconPrefab : Transform;
var iconSpacing : float;

var goal : GoalStation;

private var icons : List.<Transform>;

function AddUnitIcon(color : Color)
{
   GameObject.Instantiate(iconPrefab, Vector3.zero, Quaternion.identity);
}

function UnitReachedGoal()
{
   Debug.Log("UnitReachedGoal: index="+goal.lastFilledIndex);
}



