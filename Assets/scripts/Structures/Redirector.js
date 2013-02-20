#pragma strict
#pragma downcast
import System.Linq;

class RedirectorState
{
   var rotation : float;
}

var states : RedirectorState[];
var sign : Transform;
var initialState : int = 0;

private var currentState : int = 0;
private var unitsCaptured : Dictionary.<UnitSimple, boolean>;
private var currentHeading : float;

function Awake()
{
   unitsCaptured = new Dictionary.<UnitSimple, boolean>();
   SetState(initialState, false);
}

function SetState(state : int, useTween : boolean)
{
   if (states.Length==0)
   {
      currentState=0;
      return;
   }

   currentState = (state >= states.Length) ? 0 : state;

   // Calculate walk direction
   currentHeading = Utility.ClampAngle(transform.eulerAngles.y + states[currentState].rotation, 0, 360);

   // Changing state while a unit is still within the hitbox
   // area, so tell them to re-hop to center
   for (var u : UnitSimple in unitsCaptured.Keys)
   {
      if (u.isArcing == false)
         u.ArcTo(transform.position, 2.0, 0.5);
      u.SetFocusTarget(transform);
   }

   if (sign)
   {
      // Note these rotation operations are all relative to Space.self
      if (useTween)
         iTween.RotateTo(sign.gameObject,{"y":states[currentState].rotation,"time":0.5,"islocal":true});
      else
         sign.Rotate(0.0f, states[currentState].rotation, 0.0f);
   }
}

function OnTriggerEnter(other : Collider)
{
   var unit : UnitSimple = other.GetComponent(UnitSimple);
   if (unit)
      Redirect(unit);
}

function OnTriggerExit(other : Collider)
{
   var unit : UnitSimple = other.GetComponent(UnitSimple);
   if (unit)
   {
      if (unitsCaptured.ContainsKey(unit) && unitsCaptured[unit])
         unitsCaptured.Remove(unit);
      if (unit.heading != currentHeading)
      {
         unitsCaptured.Remove(unit);
         Redirect(unit);
      }
   }
}

function Captured(unit : UnitSimple)
{
   unitsCaptured[unit] = true;
   unit.SetDirection(currentHeading);
}

function Unstatic(unit : UnitSimple)
{
   if (unitsCaptured.ContainsKey(unit))
   {
      unitsCaptured[unit] = false;
      unit.ArcTo(transform.position, 2.0, 0.5);
      unit.SetDirection(currentHeading);
      unit.SetFocusTarget(transform);
   }
}

function Redirect(unit : UnitSimple)
{
   if (unit.isGrounded && unitsCaptured.ContainsKey(unit) == false)
   {
      unit.ArcTo(transform.position, 2.0, 0.5);
      unit.SetDirection(currentHeading);
      unit.SetFocusTarget(transform);
      unitsCaptured.Add(unit, false);
   }
}

function NextState()
{
   SetState(currentState + 1, true);
}