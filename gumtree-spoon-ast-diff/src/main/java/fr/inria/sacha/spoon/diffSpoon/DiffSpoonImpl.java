package fr.inria.sacha.spoon.diffSpoon;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.HashMap;
import java.util.List;
import java.util.Set;

import org.apache.log4j.Level;
import org.apache.log4j.Logger;
import org.junit.Before;

import spoon.compiler.SpoonCompiler;
import spoon.compiler.SpoonResource;
import spoon.compiler.SpoonResourceHelper;
import spoon.reflect.declaration.CtClass;
import spoon.reflect.declaration.CtElement;
import spoon.reflect.declaration.CtType;
import spoon.reflect.factory.Factory;
import spoon.reflect.factory.FactoryImpl;
import spoon.reflect.reference.CtTypeReference;
import spoon.support.DefaultCoreFactory;
import spoon.support.StandardEnvironment;
import spoon.support.compiler.VirtualFile;
import spoon.support.compiler.jdt.JDTBasedSpoonCompiler;
import spoon.support.compiler.jdt.JDTSnippetCompiler;
import spoon.support.reflect.declaration.CtFieldImpl;

import com.github.gumtreediff.actions.ActionGenerator;
import com.github.gumtreediff.actions.model.Action;
import com.github.gumtreediff.matchers.CompositeMatchers.ClassicGumtree;
import com.github.gumtreediff.matchers.Mapping;
import com.github.gumtreediff.matchers.MappingStore;
import com.github.gumtreediff.matchers.Matcher;
import com.github.gumtreediff.tree.ITree;
import com.github.gumtreediff.tree.TreeUtils;

/**
 * Computes the differences between two CtElements.
 * 
 * @author Matias Martinez, matias.martinez@inria.fr
 * 
 */
public class DiffSpoonImpl implements DiffSpoon {

	public static final Logger logger = Logger.getLogger(DiffSpoonImpl.class);
	protected Factory factory = null;
	private SpoonGumTreeBuilder scanner = new SpoonGumTreeBuilder();
	private HashMap<String,Integer> libs = new HashMap<String,Integer>();
	private HashMap<String,Integer> hist = new HashMap<String,Integer>();

	static {
			// default 0.3
			// 0.1 one failing much more changes
			// 0.2 one failing much more changes
			// 0.3 OK
			// 0.4 OK
			// 0.5 
			// 0.6 OK
			// 0.7 1 failing
			// 0.8 2 failing
			// 0.9 two failing tests with more changes
			System.setProperty("gumtree.match.bu.sim", "0.3");
			
			// default 2 
			// 0 is really bad for 211903 t_224542 225391 226622
			// 1 is required for t_225262 and t_213712 to pass
			System.setProperty("gumtree.match.gt.minh", "1");
			
			// default 1000
			// 1 OK
			// 10 OK
			// 100 OK
			// 2000
			// 10000 OK
			//System.getProperty("gumtree.match.bu.size", "1000");
	}
	
	@Override
	public void setNoClasspath(boolean noClasspath) {
		factory.getEnvironment().setNoClasspath(noClasspath);
	}

	public void printStats() {
		System.out.println("#STATS_START");

		System.out.print("#HISTOGRAM |");

		for (String key : hist.keySet()) {
		    System.out.format("%12s", key);
		}
		System.out.println();

		System.out.print("#HISTOGRAM |");

		for (Integer value : hist.values()) {
		    System.out.format("%12d", value);
		}

		System.out.println();

		for (HashMap.Entry<String, Integer> entry : libs.entrySet()) {
		    String key = entry.getKey();
		    Integer value = entry.getValue();

		    System.out.println("#LIB | " + key + " | " + value);
		}

		System.out.println("#STATS_END");
	}

	private void initHist() {
		hist.put("If", 0);
		hist.put("Try", 0);
		hist.put("Catch", 0);
		hist.put("Do", 0);
		hist.put("While", 0);
		hist.put("For", 0);
		hist.put("ForEach", 0);
		hist.put("Generic", 0);
		hist.put("Class",0);
		hist.put("Inheritance", 0);
		hist.put("Interface", 0);
	}

	private void increment(HashMap<String,Integer> map, String key) {
		int count = map.containsKey(key) ? map.get(key) : 0;
		map.put(key, count + 1);
	}

	public DiffSpoonImpl(Factory factory) {
		this.factory = factory;
		logger.setLevel(Level.DEBUG);
		factory.getEnvironment().setNoClasspath(true);

		initHist();
	}

	public DiffSpoonImpl() {
		factory = new FactoryImpl(new DefaultCoreFactory(),
				new StandardEnvironment());
		logger.setLevel(Level.DEBUG);
		factory.getEnvironment().setNoClasspath(true);

		initHist();
	}

	@Deprecated
	public CtDiffImpl compare(String left, String right) {

		CtType<?> clazz1;
		try {
			clazz1 = getCtType(left);

			CtType<?> clazz2 = getCtType(right);
			return compare(clazz1, clazz2);
		} catch (Exception e) {
			throw new RuntimeException(e);
		}

	}

	public CtType getCtClass(File f) throws Exception {
		SpoonResource sr1 = SpoonResourceHelper.createResource(f);
		SpoonCompiler compiler = new JDTBasedSpoonCompiler(factory);
		compiler.getFactory().getEnvironment().setLevel("OFF");
		compiler.addInputSource(sr1);
		compiler.build();
		CtType<?> clazz1 = (CtType<?>) factory.Type().getAll().get(0);
		return clazz1;
	}

	public CtType<?> getCtType(String content) throws Exception {

		SpoonCompiler compiler = new JDTSnippetCompiler(factory, content);// new
																			// JDTBasedSpoonCompiler(factory);
		// compiler.addInputSource(new VirtualFile(content,""));
		compiler.build();
		CtType<?> clazz1 = (CtType<?>) factory.Type().getAll().get(0);
		return clazz1;
	}

	public CtType<?> getCtType2(String content) throws Exception {

		/*
		 * factory.Package().getAllRoots().clear();
		 * factory.Type().getAll().clear();
		 */
		SpoonCompiler builder = new JDTSnippetCompiler(factory, content);

		builder.addInputSource(new VirtualFile(content, ""));

		try {
			builder.build();
		} catch (Exception e) {
			e.printStackTrace();
		}

		CtType<?> ret = factory.Type().getAll().get(0);
		return ret;
	}

	@Override
	public CtDiffImpl compare(File f1, File f2) throws Exception {

		CtType<?> clazz1 = getCtClass(f1);

		CtType<?> clazz2 = getCtClass(f2);

		CtDiffImpl result = this.compare(clazz1, clazz2);

		return result;
	}

	public ITree getTree(CtElement element) {
		scanner.init();
		scanner.scan(element);
		ITree tree = scanner.getRoot();
		prepare(tree);

		scanner.root = null;
		return tree;
	}

	@Override
	public CtDiffImpl compare(CtElement left, CtElement right) {

		ITree rootSpoonLeft = getTree(left);

		ITree rootSpoonRight = getTree(right);

		return compare(rootSpoonLeft, rootSpoonRight);
	}

	private CtDiffImpl compare(ITree rootSpoonLeft, ITree rootSpoonRight) {

		List<Action> actions = null;

		// GumTreeMatcher.prepare(rootSpoonLeft);
		// GumTreeMatcher.prepare(rootSpoonRight);

		prepare(rootSpoonLeft);
		prepare(rootSpoonRight);

		// ---
		/*
		 * logger.debug("-----Trees:----"); logger.debug("left tree:  " +
		 * rootSpoonLeft.toTreeString()); logger.debug("right tree: " +
		 * rootSpoonRight.toTreeString());
		 */
		// --
		// Matcher matcher = new GumTreeMatcher(rootSpoonLeft, rootSpoonRight);
		// MatcherFactory f = new CompositeMatchers.GumTreeMatcherFactory();
		// matcher = f.newMatcher(rootSpoonLeft, rootSpoonRight);
		Matcher matcher;
		MappingStore mappingsComp = null;
		mappingsComp = new MappingStore();
		matcher = new ClassicGumtree(rootSpoonLeft, rootSpoonRight,
				mappingsComp);
		// new
		matcher.match();
		//

		ActionGenerator gt = new ActionGenerator(rootSpoonLeft, rootSpoonRight,
				matcher.getMappings());
		gt.generate();
		actions = gt.getActions();

		ActionClassifier gtfac = new ActionClassifier();
		List<Action> rootActions = gtfac.getRootActions(matcher.getMappingSet(), actions);

		return new CtDiffImpl(actions, rootActions, mappingsComp, scanner);
	}

	/**
	 * 
	 * @param rootActions
	 * @param actionParent
	 * @return
	 */
	public List<Action> retriveActionChilds(List<Action> rootActions,
			Action actionParent) {

		List<Action> actions = new ArrayList<Action>();

		for (Action action : rootActions) {
			ITree t = action.getNode();
			if (t.getParent().equals(actionParent)) {
				actions.add(action);
			}

		}

		return rootActions;
	}

	public void getCtClass(Factory factory, String contents) {
		SpoonCompiler builder = new JDTSnippetCompiler(factory, contents);
		try {
			builder.build();
		} catch (Exception e) {
			throw new RuntimeException(
					"snippet compilation error while compiling: " + contents, e);
		}
	}

	public CtType getSpoonType(String contents) throws Exception {
		try {
			this.getCtClass(factory, contents);
		} catch (Exception e) {
			// must fails
			// System.out.println(" e:  "+e.getCause());
		}
		List<CtType<?>> types = factory.Type().getAll();
		if (types.isEmpty()) {
			// System.err.println("No Type was created by spoon");
			throw new Exception("No Type was created by spoon");
		}
		CtType spt = types.get(0);
		spt.getPackage().getTypes().remove(spt);

		return spt;

	}

	public String printTree(String tab, ITree t) {

		StringBuffer b = new StringBuffer();
		String type = scanner.getTypeLabel(t.getType());
		if (type == null) type = "null";

		String out = type + ":" + t.getLabel();

		if (type.equals("Class")) {
			CtElement el = null;
			el = (CtElement) t.getMetadata(SpoonGumTreeBuilder.SPOON_OBJECT);
			CtClass<?> clazz = (CtClass<?>)el;

			CtTypeReference<?> superClass = clazz.getSuperclass();
			if (superClass != null)
				out += ":e:" + superClass.getSimpleName();

			Set<CtTypeReference<?>> interfaces = clazz.getSuperInterfaces();
			Iterator<CtTypeReference<?>> itr = interfaces.iterator();
			while(itr.hasNext()) {
				CtTypeReference<?> superInterface = itr.next();
				out += ":i:" + superInterface.getSimpleName();
			}
		} else if (type.equals("StaticType")) {
			CtElement el = null;
			el = (CtElement) t.getMetadata(SpoonGumTreeBuilder.SPOON_OBJECT);
			if (el instanceof CtFieldImpl) {
				CtFieldImpl field = (CtFieldImpl)el;
				CtTypeReference<?> typeVar = field.getType();
				if(!typeVar.isPrimitive() && typeVar.toString().contains("<") && typeVar.toString().contains(">")) {
					String types = typeVar.toString();
					types = types.replaceAll(".*<", "").replaceAll(">", "").replaceAll(" ", "");
					String[] splited = types.split(",");
					for (String tsplit : splited)
						out += ":" + tsplit;
				}
			}
		}

		b.append(out + " \n");
		Iterator<ITree> cIt = t.getChildren().iterator();
		while (cIt.hasNext()) {
			ITree c = cIt.next();
			b.append(tab + " " + printTree("\t" + tab, c));
			// if (cIt.hasNext()) b.append(" ");
		}
		// b.append(")");
		return b.toString();

	}

	public void treeStats(ITree t) {
		String type = scanner.getTypeLabel(t.getType());
		if (type == null) type = "null";
		
		if (type.equals("Class")) {
			increment(hist, type);

			// Get Class
			CtElement el = null;
			el = (CtElement) t.getMetadata(SpoonGumTreeBuilder.SPOON_OBJECT);
			CtClass<?> clazz = (CtClass<?>)el;

			// Has super class
			CtTypeReference<?> superClass = clazz.getSuperclass();
			if (superClass != null) {
				increment(hist, "Inheritance");
			}

			// Has interface
			Set<CtTypeReference<?>> interfaces = clazz.getSuperInterfaces();
			Iterator<CtTypeReference<?>> itr = interfaces.iterator();
			while(itr.hasNext()) {
				CtTypeReference<?> superInterface = itr.next();
				increment(hist, "Interface");
			}
		} else if (type.equals("StaticType")) {
			increment(libs, t.getLabel());

			CtElement el = null;
			el = (CtElement) t.getMetadata(SpoonGumTreeBuilder.SPOON_OBJECT);
			if (el instanceof CtFieldImpl) {
				CtFieldImpl field = (CtFieldImpl)el;
				CtTypeReference<?> typeVar = field.getType();

				// Check if generic
				if(!typeVar.isPrimitive() && typeVar.toString().contains("<") && typeVar.toString().contains(">")) {
					increment(hist, "Generic");

					// Get generic types
					String types = typeVar.toString();
					types = types.replaceAll(".*<", "").replaceAll(">", "").replaceAll(" ", "");
					String[] splited = types.split(",");
					for (String tsplit : splited) {
						increment(libs, tsplit);
					}
				}
			}
		} else if (type.equals("If")) {
			increment(hist, type);
		} else if (type.equals("Try")) {
			increment(hist, type);
		} else if (type.equals("Catch")) {
			increment(hist, type);
		} else if (type.equals("Do")) {
			increment(hist, type);
		} else if (type.equals("While")) {
			increment(hist, type);
		} else if (type.equals("For")) {
			increment(hist, type);
		}  else if (type.equals("ForEach")) {
			increment(hist, type);
		}


		Iterator<ITree> cIt = t.getChildren().iterator();
		while (cIt.hasNext()) {
			ITree c = cIt.next();
			treeStats(c);
		}
		
	}

	public void prepare(ITree node) {
		node.refresh();
		TreeUtils.postOrderNumbering(node);
		TreeUtils.computeHeight(node);
		// TreeUtils.computeDigest(node);
	}

	public static void main(String[] args) throws Exception {

		if (args.length != 3) {
			System.out.println("Usage: DiffSpoon <cmp:one> <file_1>  <file_2>");
			return;
		}

		File f1 = new File(args[1]);
		File f2 = new File(args[2]);

		DiffSpoonImpl ds = new DiffSpoonImpl();
		if (f1.getPath().equals("/dev/null") && args[0].equals("one")) {
			System.out.println("AST DIFF: NEW FILE");
			System.out.println(f2.getPath());
			CtType<?> clazz = ds.getCtClass(f2);
			ITree rootSpoon = ds.getTree(clazz);
			ds.treeStats(rootSpoon);
			//System.out.println(ds.printTree(":", rootSpoon));
		} else if (f2.getPath().equals("/dev/null") && args[0].equals("cmp")) {
			System.out.println("AST DIFF: NEW FILE");
			System.out.println(f1.getPath());
			CtType<?> clazz = ds.getCtClass(f1);
			ITree rootSpoon = ds.getTree(clazz);
			ds.treeStats(rootSpoon);
			//System.out.println(ds.printTree(":", rootSpoon));
		} else if (args[0].equals("cmp")) {
			// File Changed
			//CtDiffImpl result = ds.compare(f1, f2);
			//System.out.println(result.toString());
		}

		ds.printStats();
	}

	public static String readFile(File f) throws IOException {
		FileReader reader = new FileReader(f);
		char[] chars = new char[(int) f.length()];
		reader.read(chars);
		String content = new String(chars);
		reader.close();
		return content;
	}

}
