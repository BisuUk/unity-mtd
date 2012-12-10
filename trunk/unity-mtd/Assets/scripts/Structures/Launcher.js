#pragma strict
#pragma downcast

var launchPos : Transform;
var character : GameObject;
var netView : NetworkView;
var isSelected : boolean;
var selectPrefab : Transform;

private var loadedUnit : Unit;
private var numUnitsContained : int;
private var selectionFX : Transform;


function Awake()
{
   selectPrefab.gameObject.SetActive(false);
}

function OnMouseDown()
{
   if (numUnitsContained==1)
      UIControl.CurrentUI().SendMessage("OnSelectLauncher", this, SendMessageOptions.DontRequireReceiver);
}

function SetSelected(selected : boolean)
{
   isSelected = selected;

   selectPrefab.gameObject.SetActive(isSelected);
   var tween : TweenScale = selectPrefab.GetComponent(TweenScale);
   if (tween && isSelected)
   {
      tween.Reset();
      tween.Play(true);
   }
}

function OnTriggerEnter(other : Collider)
{
   var unit : Unit = other.GetComponent(Unit);
   if (unit)
   {
      if (numUnitsContained==1)
      {
         unit.ReversePath();
      }
      else
      {
         unit.SetWalking(false);
         loadedUnit = unit;
         unit.SetPosition(launchPos.position);
         numUnitsContained += 1;
      }
   }
}

function Fire(position : Vector3)
{
   Debug.Log("Launcher Fire: " +position);
   loadedUnit.LeapTo(position, 150, 1.0);

   loadedUnit = null;
   numUnitsContained = 0;
}


