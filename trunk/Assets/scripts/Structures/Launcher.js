#pragma strict
#pragma downcast

class Launcher extends Structure
{
var unitAttachPoint : Transform;
var model : GameObject;
var maxRange : float;
var maxAimTime : float;
var reticuleFX : Transform;
var selectionFX : Transform;
var fireAnimationSpeed : float;
var netView : NetworkView;

private var aimStartTime : float;
private var loadedUnit : Unit;
private var numUnitsContained : int;


function Awake()
{
   selectionFX.gameObject.SetActive(false);
   reticuleFX.gameObject.SetActive(false);
   reticuleFX.position = transform.position;
}

function OnMouseDown()
{
   if (numUnitsContained==1)
      UIControl.CurrentUI().SendMessage("OnSelectLauncher", this, SendMessageOptions.DontRequireReceiver);
}

//virtual
function SetSelected(selected : boolean)
{
   //Debug.Log("Launcher SetSelected");
   isSelected = selected;

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
      }
   }
}

function Update()
{
   if (isSelected)
   {
      var hit : RaycastHit;
      var mask = (1 << 10) | (1 << 4);
      // Draw ray from camera mousepoint to ground plane.
      var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
      if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
      {
         // Look towards mouse cursor
         var lookat : Vector3 = hit.point;
         lookat.y = transform.position.y;
         transform.LookAt(lookat);

         // move reticule outward
         if (isAiming)
         {
            var vectToAim : Vector3 = (hit.point - transform.position);
            vectToAim.y = transform.position.y;
            vectToAim.Normalize();

            var currentRange : float = Mathf.InverseLerp(0, maxAimTime, (Time.time - aimStartTime)) * maxRange;

            //Debug.Log("currentRange:"+currentRange);
            var reticulePos : Vector3 = transform.position + (vectToAim * currentRange);
            reticuleFX.position = Utility.GetGroundAtPosition(reticulePos, 5.0);
         }
      }
   }
}

//virtual
function Aim()
{
   //Debug.Log("Launcher Aim:");
   isAiming = true;
   aimStartTime = Time.time;
   reticuleFX.gameObject.SetActive(true);
   reticuleFX.position = transform.position;
}

//virtual
function Fire()
{
   //Debug.Log("Launcher Fire: " +reticuleFX.position);
   model.animation["fire"].speed = fireAnimationSpeed;
   model.animation.Play("fire");

   loadedUnit.transform.parent = null;
   loadedUnit.LeapTo(reticuleFX.position, 150, 1.0, true);

   isAiming = false;
   aimStartTime = 0.0;
   loadedUnit = null;
   numUnitsContained = 0;
   // Keep reticule there for a second
   Invoke("HideReticule", 0.75);
}

//virtual
function CancelAim()
{
   aimStartTime = 0.0;
   isAiming = false;
   reticuleFX.gameObject.SetActive(false);
}

private function HideReticule()
{
   if (!isAiming)
      reticuleFX.gameObject.SetActive(false);
}


} // class


