#pragma strict
import System.Collections.Generic;

var playerID : int;
var selectedSquadID : int;
var squads : Dictionary.<int,UnitSquad>;
var selectedTower : GameObject;

function selectedSquad() : UnitSquad
{
   if (squads.ContainsKey(selectedSquadID))
      return squads[selectedSquadID];
   else
      return null;
}

function Start ()
{
   selectedSquadID = -1;
   selectedTower = null;
   squads = new Dictionary.<int,UnitSquad>();
}

function AddSquad(squad : UnitSquad)
{
   squad.count = 1;
   squads[squad.id] = squad;
   selectedSquadID = squad.id;
}

function RemoveSquad(squadID : int)
{
   squads.Remove(squadID);
   selectedSquadID = -1;
}

function ModifySquadCount(squadID : int, amount : int)
{
   squads[squadID].count += amount;
   if (squads[squadID].count < 1)
      squads[squadID].count = 1;

}

function SetSquadColor(squadID : int, color : Color)
{
   if (squads.ContainsKey(squadID))
      squads[squadID].color = color;
}

function SetSquadSides(squadID : int, sides : int)
{
   if (squads.ContainsKey(squadID))
      squads[squadID].sides = sides;
}

function SetSquadSize(squadID : int, size : float)
{
   if (squads.ContainsKey(squadID))
      squads[squadID].size = size;
}

function SetSquadDeployed(squadID : int, value : boolean)
{
   if (squads.ContainsKey(squadID))
      squads[squadID].deployed = value;
}