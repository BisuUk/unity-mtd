#pragma strict
#pragma downcast


var requiredColors : Color[];
var isFull : boolean;
var lastFilledIndex : int;
var assignedIndex : int;

private var colorsFilled : boolean[];

function Awake()
{
   colorsFilled = new boolean[requiredColors.Length];
}

function Start()
{

}

private function fillRequireColor(color : Color) : boolean
{
   var index : int = 0;
   for (var c : Color in requiredColors)
   {
      if (c == color && colorsFilled[index]==false)
      {
         colorsFilled[index]=true;
         lastFilledIndex = index;
         return true;
      }
      index += 1;
   }
   return false;
}

function CheckFull()
{
   for (var b : boolean in colorsFilled)
   {
      if (b == false)
         return false;
   }
   return true;
}

function OnTriggerEnter(other : Collider)
{
   if (!Network.isClient && !isFull)
   {
      var unit : Unit = other.GetComponent(Unit);
      if (unit && fillRequireColor(unit.actualColor))
      {
         isFull = CheckFull();
         Game.control.UnitReachedGoal(this);
      }
      unit.Kill(0.1);
   }
}
