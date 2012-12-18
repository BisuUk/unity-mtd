#pragma strict
#pragma downcast

class PaintGun extends Structure
{
var maxRange : float;
var maxShots : float;
var cooldownTime : float;
var shotArcHeight : float;
var shotTimeToImpact : float;
var model : GameObject;
var fireAnimationSpeed : float;
var unitAttachPoint : Transform;
var muzzle : Transform;
var shotFX : Transform;
var reticuleFX : Transform;
var selectionFX : Transform;
var netView : NetworkView;

private var loadedUnit : Unit;
private var numUnitsContained : int;
private var shotColor : Color;
private var shotsRemaining : float;
private var fireAngle : Vector3;

function Awake()
{
   selectionFX.gameObject.SetActive(false);
   reticuleFX.gameObject.SetActive(false);
   shotColor = Color.white;
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

         shotColor = loadedUnit.actualColor;
         shotsRemaining = maxShots;
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

      //fireAngle = Utility.CalculateTrajectory(muzzle.position, mousePos, speedsies, true);
      //Debug.Log("Traj:"+fireAngle);
      //transform.rotation = Quaternion.LookRotation(fireAngle.normalized);



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

   var shot : BallisticProjectile = Instantiate(shotFX, muzzle.position, Quaternion.identity).GetComponent(BallisticProjectile);
   shot.arcHeight = shotArcHeight;
   shot.timeToImpact = shotTimeToImpact;
   shot.SendMessage("SetColor", loadedUnit.actualColor);
   shot.FireAt(Game.control.GetMouseWorldPosition());

   shotsRemaining -= 1;

   if (shotsRemaining <= 0)
   {
      shotsRemaining = 0;
      //loadedUnit.Splat(false);
      loadedUnit.Remove();
      loadedUnit = null;
      numUnitsContained = 0;
      Game.player.ClearSelectedStructure();
   }
   // Keep reticule there for a second
   //reticuleFX.gameObject.SetActive(false);
   Invoke("Cooldown", cooldownTime);
}

private function Cooldown()
{
   //numUnitsContained = 0;
}

} // class


