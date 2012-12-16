#pragma strict
#pragma downcast

class PaintGun extends Structure
{
var unitAttachPoint : Transform;
var model : GameObject;
var maxRange : float;
var cooldownTime : float;
var reticuleFX : Transform;
var selectionFX : Transform;
var fireAnimationSpeed : float;
var netView : NetworkView;

private var loadedUnit : Unit;
private var numUnitsContained : int;


function Awake()
{
   selectionFX.gameObject.SetActive(false);
   reticuleFX.gameObject.SetActive(false);
}

function OnMouseDown()
{
   if (numUnitsContained==1)
      UIControl.CurrentUI().SendMessage("OnClickStructure", this, SendMessageOptions.DontRequireReceiver);
}

//virtual
function SetSelected(selected : boolean)
{
   //Debug.Log("Launcher SetSelected");
   isSelected = selected;

   reticuleFX.gameObject.SetActive(selected);

   selectionFX.gameObject.SetActive(isSelected);
   var tween : TweenScale = selectionFX.GetComponent(TweenScale);
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
         loadedUnit = unit;
         loadedUnit.SetWalking(false);
         loadedUnit.SetPosition(unitAttachPoint.position);
         loadedUnit.transform.parent = unitAttachPoint;
         numUnitsContained += 1;
         reticuleFX.gameObject.SetActive(isSelected);
      }
   }
}

// virtual
// Press can be anywhere, but only triggers while selected
function OnPress(isPressed : boolean)
{
   if (numUnitsContained==1)
      Fire();
}

function Update()
{
   if (isSelected)
   {
      var mousePos : Vector3 = Game.control.GetMouseWorldPosition();

      // Look towards mouse cursor, with no pitch
      var lookat : Vector3 = mousePos;
      lookat.y = transform.position.y;
      transform.LookAt(lookat);

      var vectToAim : Vector3 = (mousePos - transform.position);
      //vectToAim.y = transform.position.y;

      // Put reticule at mouse pos, within range
      var reticulePos : Vector3 = mousePos;
      if (vectToAim.magnitude > maxRange)
         reticulePos = transform.position + (vectToAim.normalized * maxRange);
      reticuleFX.position = Utility.GetGroundAtPosition(reticulePos, 5.0);
   }
}

//virtual
function Fire()
{
   //Debug.Log("Launcher Fire: " +reticuleFX.position);
   if (model)
   {
      model.animation["fire"].speed = fireAnimationSpeed;
      model.animation.Play("fire");
   }

   loadedUnit.transform.parent = null;
   loadedUnit.LeapTo(reticuleFX.position, 20, 0.15, true);
   loadedUnit = null;

   // Keep reticule there for a second
   reticuleFX.gameObject.SetActive(false);
   Invoke("Cooldown", cooldownTime);
}

private function Cooldown()
{
   numUnitsContained = 0;
}

} // class


