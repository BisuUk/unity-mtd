#pragma strict
#pragma downcast
import System.Linq;

class RedirectorState
{
   var pathHeadNode : Transform;
   var signRotation : float;
}

var states : RedirectorState[];
var sign : Transform;
var initialState : int = 0;
var netView : NetworkView;

private var currentState : int = 0;
private var unitsCaptured : Dictionary.<UnitSimple, boolean>;
//private var currentPath : List.<Vector3>;


function Awake()
{
   if (sign)
      sign.parent = null;
   //currentPath = new List.<Vector3>();
   SetState(initialState, false);
   unitsCaptured = new Dictionary.<UnitSimple, boolean>();
}

function SetState(state : int, useTween : boolean)
{
   if (states.Length==0)
   {
      currentState=0;
      return;
   }

   currentState = (state >= states.Length) ? 0 : state;
/*
   // Parse path for this state
   var headNode : Transform = states[currentState].pathHeadNode;
   if (headNode != null)
   {
      currentPath.Clear();
      currentPath.Add(transform.position);
      //for (var child : Transform in headNode.OrderBy(function(t) { return t.gameObject.name; } ))
      for (var child : Transform in headNode)
      {
         currentPath.Add(child.position);
      }
   }
*/
   if (sign)
   {
      var newRotation : Vector3 = sign.rotation.eulerAngles;
      newRotation.y = states[currentState].signRotation;

      if (useTween)
         iTween.RotateTo(sign.gameObject, newRotation, 0.5);
      else
         sign.rotation = Quaternion.Euler(newRotation);

   }
}

function OnTriggerEnter(other : Collider)
{
   var unit : UnitSimple = other.GetComponent(UnitSimple);
   Debug.Log("Enter a="+unit.isArcing);
   if (unit)
      Redirect(unit);
}

function OnTriggerExit(other : Collider)
{
   var unit : UnitSimple = other.GetComponent(UnitSimple);
   if (unit)
   {
      if (unitsCaptured[unit])
      {
         Debug.Log("Exit c="+unitsCaptured[unit]);
         unitsCaptured.Remove(unit);
      }
   }
}


function Captured(unit : UnitSimple)
{
Debug.Log("Capture");
   unitsCaptured[unit] = true;
}

function Unstatic(unit : UnitSimple)
{

   if (unitsCaptured.ContainsKey(unit))
   {
      Debug.Log("Unstatic");
      unit.SetDirection(states[currentState].signRotation);
      unit.ArcTo(transform.position, 2.0, 0.5);
   }
}


function Redirect(unit : UnitSimple)
{
   if (unitsCaptured.ContainsKey(unit) == false)
   {
   Debug.Log("Bounce");
      //unit.SetPath(currentPath);
      unit.SetDirection(states[currentState].signRotation);
      unit.ArcTo(transform.position, 2.0, 0.5);
      unit.SetFocusTarget(transform);
      unitsCaptured.Add(unit, false);
   }
}

function NextState()
{
   SetState(currentState + 1, true);
}

@RPC
function ToServerNextState()
{
   SetState(currentState + 1, true);
}

@RPC
function ToClientSetState(newState : int)
{
   SetState(newState, true);
}