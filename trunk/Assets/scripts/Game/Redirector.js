#pragma strict
#pragma downcast

class RedirectorState
{
   var pathHeadNode : Transform;
   var signRotation : float;
}

var states : RedirectorState[];
var sign : Transform;
private var currentState = 0;
private var currentPath : List.<Vector3>;

function Awake()
{
   currentPath = new List.<Vector3>();
   SetState(0);
}

function SetState(state : int)
{
   if (states.Length==0)
   {
      currentState=0;
      return;
   }

   currentState = (state >= states.Length) ? 0 : state;

   // Parse path for this state
   var headNode : Transform = states[currentState].pathHeadNode;
   if (headNode != null)
   {
      currentPath.Clear();
      for (var child : Transform in headNode)
         currentPath.Add(child.position);
   }

   if (sign)
   {
      var newRotation : Vector3 = sign.rotation.eulerAngles;
      newRotation.y = states[currentState].signRotation;
      //sign.rotation = Quaternion.Euler(newRotation);
      iTween.RotateTo(sign.gameObject, newRotation, 0.5);
   }
}

function OnMouseDown()
{
   SetState(currentState + 1);
}

function Redirect(unit : Unit)
{
   if (!Network.isClient)
   {
      unit.SetPath(currentPath);
   }
}