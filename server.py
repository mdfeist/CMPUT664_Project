import sys
import os
import json
from flask import Flask, request, redirect, send_from_directory, render_template

projects = []

class attrdict(dict):
    def __init__(self, *args, **kwargs):
        dict.__init__(self, *args, **kwargs)
        self.__dict__ = self

class Project:
    def __init__(self):
        self._dir = ""
        self._commits = []

    def setDir(self, name):
        self._dir = name

    def getDir(self):
        return self._dir

    def addCommit(self, commit):
        self._commits.append(commit)

    def getCommits(self):
        return self._commits

    def getAuthors(self):
        authors = set()
        
        for commit in self._commits:
            author = commit.getAuthor()
            authors.add(author)

        return authors

    def getEdit(self, commit, edit, t):
        date_json = {}
        date_json["author"] = commit.getAuthor()
        date_json["commitID"] = commit.getCommitID()
        date_json["date"] = commit.getDate()
        date_json["type"] = t
        date_json["edit"] = edit

        return date_json

    def getJSON(self, options):
        print(options)

        json_data = {}
        types = set()

        json_data["commits"] = list()
        json_data["dates"] = list()

        # Build JSON
        for commit in self._commits:
            # Ignore large commits.
            if options.ignore_large_commits and len(commit.getFiles()) > 50:
                continue

            commit_json = {}
            commit_json["author"] = commit.getAuthor()
            commit_json["commitID"] = commit.getCommitID()
            commit_json["date"] = commit.getDate()
            commit_json["message"] = commit.getMessage()
            commit_json["files"] = commit.getTFiles()

            json_data["commits"].append(commit_json)

            # Get types
            for f in commit.getFiles():
                if options.types == "Declarations" or options.types == "Types":
                    for t in f.getDeclarations().getAdditionHist():
                        types.add(t)
                        json_data["dates"].append(self.getEdit(commit, "ADD", t))
                    for t in f.getDeclarations().getDeletionHist():
                        types.add(t)
                        json_data["dates"].append(self.getEdit(commit, "REMOVE", t))

                if options.types == "Types":
                    for t in f.getInvocations().getAdditionHist():
                        # Skip java.lang.Object#Object()
                        if (t == "java.lang.Object#Object()"):
                            continue

                        tt = t.split("#")
                        if (tt[0] != ""):
                            types.add(tt[0])
                            json_data["dates"].append(self.getEdit(commit, "ADD", tt[0]))
                    for t in f.getInvocations().getDeletionHist():
                        # Skip java.lang.Object#Object()
                        if (t == "java.lang.Object#Object()"):
                            continue

                        tt = t.split("#")
                        if (tt[0] != ""):
                            types.add(tt[0])
                            json_data["dates"].append(self.getEdit(commit, "REMOVE", tt[0]))

                if options.types == "Invocations":
                    for t in f.getInvocations().getAdditionHist():
                        # Skip java.lang.Object#Object()
                        if (t == "java.lang.Object#Object()"):
                            continue

                        types.add(t)
                        json_data["dates"].append(self.getEdit(commit, "ADD", t))
                    for t in f.getInvocations().getDeletionHist():
                        # Skip java.lang.Object#Object()
                        if (t == "java.lang.Object#Object()"):
                            continue
                            
                        types.add(t)
                        json_data["dates"].append(self.getEdit(commit, "REMOVE", t))

        json_data["types"] = list(types)


        return json.dumps(json_data)

    def __str__(self):
        output = self._dir + "\n"
        output += "Number of Commits: " + str(len(self._commits)) + "\n"

        for commit in self._commits:
            output += commit.toStr("\t")

        return output
    
    def __repr__(self):
        return self.__str__()

class Commit:
    def __init__(self):
        self._author = ""
        self._commit = ""
        self._date = ""
        self._message = ""
        self._file_names = []
        self._files = []

    def setAuthor(self, name):
        self._author = name

    def getAuthor(self):
        return self._author

    def setCommitID(self, commit):
        self._commit = commit

    def getCommitID(self):
        return self._commit

    def setDate(self, date):
        self._date = date

    def getDate(self):
        return self._date

    def setMessage(self, message):
        self._message = message

    def getMessage(self):
        return self._message

    def addTFile(self, f):
        self._file_names.append(f)

    def getTFiles(self):
        return self._file_names

    def addFile(self, f):
        self._files.append(f)

    def getFiles(self):
        return self._files

    def toStr(self, tab):
        output = tab + "####################### COMMIT #######################\n"
        output += tab + "Author: " + self._author + "\n"
        output += tab + "Commit ID: " + self._commit + "\n"
        output += tab + "Date: " + self._date + "\n"

        output += tab + "Number of Files: " + str(len(self._files)) + "\n"
        for f in self._file_names:
            output += tab + "\t" + f + "\n"

        output += tab + "Message: \n" + tab + "\t" + \
            self._message.replace("\n", "\n" + tab + "\t") + "\n"

        output += tab + "Stats: \n"
        for f in self._files:
            output += f.toStr(tab + "\t") + "\n" 
        output += tab + "######################################################\n"

        return output

    def __str__(self):
        return self.toStr("")
    
    def __repr__(self):
        return self.__str__()

class File:
    def __init__(self):
        self._local = ""
        self._remote = ""
        self._declarations = Histogram("Declarations")
        self._invocations = Histogram("Invocations")

    def setLocal(self, name):
        self._local = name

    def getLocal(self):
        return self._local

    def setRemote(self, name):
        self._remote = name

    def getRemote(self):
        return self._remote

    def getDeclarations(self):
        return self._declarations

    def getInvocations(self):
        return self._invocations

    def toStr(self, tab):
        output = tab + "Local File: " + self._local + "\n"
        output += tab + "Remote File: " + self._remote + "\n"

        output += self._declarations.toStr(tab + "\t")
        output += self._invocations.toStr(tab + "\t")

        return output

    def __str__(self):
        return self.toStr("")
    
    def __repr__(self):
        return self.__str__()

class Histogram:
    def __init__(self, name):
        self._name = name
        self._hist_add = {}
        self._hist_delete = {}

    def add(self, name, edit, value):
        if edit == "INSERT":
            if name in self._hist_add:
                self._hist_add[name] += value
            else:
                self._hist_add[name] = value
        elif edit == "DELETE":
            if name in self._hist_delete:
                self._hist_delete[name] += value
            else:
                self._hist_delete[name] = value

    def getAdditionHist(self):
        return self._hist_add

    def getDeletionHist(self):
        return self._hist_delete

    def toStr(self, tab):
        output = tab + self._name + "\n"
        output += tab + "\tAdditions\n"

        for key, value in self._hist_add.items():
            output += tab + "\t\t" + key + ": " + str(value) + "\n"

        output += tab + "\tDeletions\n"

        for key, value in self._hist_delete.items():
            output += tab + "\t\t" + key + ": " + str(value) + "\n"

        return output

    def __str__(self):
        return self.toStr("")
    
    def __repr__(self):
        return self.__str__()

def getStats(filename):
    project_start = False
    current_project = None
    current_commit = None
    current_file = None
    message_start = False
    message = ""
    file_touched_start = False
    with open(filename) as f:
        for line in f:
            if ("#PROJECT_START" in line):
                current_project = Project()
                project_start = True
            if ("#PROJECT_END" in line):
                #print(current_project)
                projects.append(current_project)
                project_start = False
            if ("#PROJECT_NAME" in line):
                name = line.split("|")[1].replace('\n','').replace('/','').strip()
                current_project.setDir(name)
            if ("#COMMIT_START" in line):
                current_commit = Commit()
            if ("#COMMIT_END" in line):
                #print(current_commit)
                current_project.addCommit(current_commit)
            if ("#AUTHOR" in line):
                name = line.split("|")[1].replace('\n','').strip()
                current_commit.setAuthor(name)
            if ("#COMMIT_ID |" in line):
                commits = line.split("|")[1].replace('\n','').strip().split()
                current_commit.setCommitID(commits[0])
            if ("#DATE |" in line):
                date = line.split("|")[1].replace('\n','').strip()
                d = date.split()
                current_commit.setDate(d[0] + "T" + d[1] + d[2])
            if ("#COMMIT_MESSAGE_END" in line):
                current_commit.setMessage(message)
                message_start = False
                message = ""
            if (message_start):
                message += line
            if ("#COMMIT_MESSAGE_START" in line):
                message_start = True
            if ("#FILES_TOUCHED_END" in line):
                file_touched_start = False
            if (file_touched_start):
                current_commit.addTFile(line.replace('\n','').strip())
            if ("#FILES_TOUCHED_START" in line):
                file_touched_start = True
            if ("#FILE1" in line):
                name = line.split("|")[1].replace('\n','').strip()
                current_file.setLocal(name)
            if ("#FILE2" in line):
                name = line.split("|")[1].replace('\n','').strip()
                current_file.setRemote(name)
            if ("#STATS_START" in line):
                current_file = File()
            if ("#STATS_END" in line):
                #print(current_file)
                current_commit.addFile(current_file)
            if ("#DECLARE" in line):
                split_str = line.split("|")
                edit = split_str[1].strip()
                name = split_str[2].strip()
                value = int(split_str[3].strip())
                current_file.getDeclarations().add(name, edit, value)
#            if ("#GENERIC_DECLARE" in line):
#                split_str = line.split("|")
#                edit = split_str[1].strip()
#                name = split_str[2].strip()
#                value = int(split_str[3].strip())
#                current_file.getGenericDeclarations().add(name, edit, value)
#            if ("#USED_IN_GENERIC_DECLARE" in line):
#                split_str = line.split("|")
#                edit = split_str[1].strip()
#                name = split_str[2].strip()
#                value = int(split_str[3].strip())
#                current_file.getUsedInGenericDeclarations().add(name, edit, value)
            if ("#INVOCATIONS" in line):
                split_str = line.split("|")
                edit = split_str[1].strip()
                name = split_str[2].strip()
                value = int(split_str[3].strip())
                current_file.getInvocations().add(name, edit, value)

    if (project_start):
        projects.append(current_project)


def mergeProjectCSV(csv):
    title = csv.split('\n', 1)[0]
    csv = csv.replace(title, "")
    csv = title + csv
    return os.linesep.join([s for s in csv.splitlines() if s])


files = ["out1.out", 
        "out2.out",
        "out3.out",
        "out4.out",
        "out5.out",
        "out6.out",
        "out7.out"]

files = ["test.out"]

print("Gathering Dump Data ...")
for f in files:
    getStats(f)
print("Number of Projects: " + str(len(projects)))
print("Gathering Stats ...")

# set the project root directory as the static folder, you can set others.
path = os.path.dirname(os.path.realpath(__file__))
static_folder = path + '/www'
template_folder = path + '/www/templates'
app = Flask(__name__, static_folder=static_folder, static_url_path='/www', template_folder=template_folder)
app.config['DEBUG'] = True

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory(app.static_folder + '/js', path)

@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory(app.static_folder + '/css', path)

@app.route('/')
def root():
    #return app.send_static_file('index.html')
    return redirect('/projects')

@app.route('/projects')
def dashboard():
    return render_template('projects.html', projects=projects)

@app.route('/projects/<path:path>')
def show_project(path):
    name = path.replace('/','')
    for project in projects:
        if (project.getDir() == name):
           return render_template('project_view.html', authors=list(project.getAuthors()))
    return name

@app.route('/projects/<path:path>/get_project')
def get_project(path):
    #query_string = request.query_string
    query_type = request.args.get('type') 
    #print(query_type)

    for project in projects:
        if (project.getDir() == path):
            options = attrdict()
            options.get = "Project"
            options.types = query_type
            options.ignore_large_commits = True
            return project.getJSON(options)

    return ""

if __name__ == "__main__":
    app.run()

#dump_file = open('dump.out', 'w')
#
#for project in projects:
#    #print(project.getStats()[2])
#    stats = project.getJSON()
#    
#    dump_file.write(stats)
